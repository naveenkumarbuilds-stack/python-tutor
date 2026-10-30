import json
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.providers import get_provider
from backend.tests.test_ai import FakeProvider

KINDS=['mcq','output prediction','conceptual','viva','debugging']

def quiz():
    return {'questions':[{'kind':kind,'prompt':'What does x store? '+kind,'options':['1','2','3','4'],'answer':0,'explanation':'x is assigned 1.'} for kind in KINDS]}

def issues():
    return {'issues':[{'start_line':1,'end_line':1,'label':'possible logic issue','reason':'Consider whether 1 is the intended value.','suggested_fix':'Check the assignment against the requirement.','corrected_example':'x = 2'}],'note':'These are uncertain suggestions, not verified errors.'}

def prediction():
    return {'deterministic':True,'dependencies':[],'expected_output':{'kind':'predicted','text':'','caveat':'No code was run.'},'explanation':'The assignment does not print.'}

def trace():
    return {'label':'AI-predicted, not real runtime','steps':[{'line':1,'variables':[{'name':'x','value':'1','type':'int'}],'call_stack':[{'name':'module','line':1}],'output':'','explanation':'Assign 1.'}],'caveat':'No code was executed.','truncated':False}

@pytest.fixture
def setup():
    app=create_app('1000/minute');provider=FakeProvider()
    app.dependency_overrides[get_provider]=lambda:provider
    with TestClient(app) as client:yield client,provider,app

@pytest.mark.parametrize('kind,fixture',[('quiz',quiz),('issues',issues),('prediction',prediction),('trace',trace)])
def test_generated_activities_cache_and_regenerate(setup,kind,fixture):
    client,provider,_=setup;provider.outputs=[json.dumps(fixture())]
    for _ in range(2):assert client.post('/api/'+kind,json={'code':'x=1'}).json()==fixture()
    assert provider.calls==1
    assert client.post('/api/'+kind,json={'code':'x=1','regenerate':True}).status_code==200
    assert provider.calls==2

@pytest.mark.parametrize('kind',['quiz','issues','prediction','trace'])
def test_new_endpoint_invalid_json_retry(setup,kind):
    client,provider,_=setup;provider.outputs=['{}']
    response=client.post('/api/'+kind,json={'code':'x=1'})
    assert response.status_code==502
    assert provider.calls==2

@pytest.mark.parametrize('fault',['missing_kind','bad_answer','duplicate_options','not_five'])
def test_quiz_rejects_invalid_questions(setup,fault):
    client,provider,_=setup;value=quiz()
    if fault=='missing_kind':value['questions'][0]['kind']='viva'
    if fault=='bad_answer':value['questions'][0]['answer']=4
    if fault=='duplicate_options':value['questions'][0]['options']=['1']*4
    if fault=='not_five':value['questions'].pop()
    provider.outputs=[json.dumps(value)]
    assert client.post('/api/quiz',json={'code':'x=1'}).status_code==502

@pytest.mark.parametrize('kind',['issues','trace'])
def test_source_ranges_checked(setup,kind):
    client,provider,_=setup;value=issues() if kind=='issues' else trace()
    if kind=='issues':value['issues'][0]['end_line']=20
    else:value['steps'][0]['call_stack'][0]['line']=20
    provider.outputs=[json.dumps(value)]
    assert client.post('/api/'+kind,json={'code':'x=1'}).status_code==502

@pytest.mark.parametrize('source',['x=input()','import random\nx=random.random()','x=open("a.txt").read()'])
def test_external_output_never_compared_as_deterministic(setup,source):
    client,provider,_=setup;provider.outputs=[json.dumps(prediction())]
    value=client.post('/api/prediction',json={'code':source}).json()
    assert value['deterministic'] is False and value['dependencies']
    assert value['expected_output']['text']=="I can't tell from this code."


def test_external_trace_not_fabricated(setup):
    client,provider,_=setup;provider.outputs=[json.dumps(trace())]
    value=client.post('/api/trace',json={'code':'x=input()'}).json()
    assert value['steps']==[] and value['truncated']


def test_no_sandbox_execution_endpoint(setup):
    client,_,_=setup
    assert client.post('/api/execute',json={'code':'print(1)'}).status_code==404


def test_all_new_ai_features_share_budget(setup):
    client,provider,app=setup
    from backend.ai_service import AIService
    app.state.ai_service=AIService(daily_cap=1)
    provider.outputs=[json.dumps(quiz())]
    assert client.post('/api/quiz',json={'code':'x=1'}).status_code==200
    assert client.post('/api/prediction',json={'code':'x=1'}).status_code==429


def test_ast_flowchart_independent_of_ai(setup):
    client,provider,_=setup
    response=client.post('/api/flowchart',json={'code':'x=1\nif x:\n    print(x)\nelse:\n    print(0)'})
    assert response.status_code==200
    value=response.json();assert value['label']=='Generated from Python AST'
    assert '|Yes|' in value['mermaid'] and '|No|' in value['mermaid']
    assert provider.calls==0


def test_ast_loop_else_break_continue_and_functions(setup):
    client,_,_=setup
    source='def example(items):\n    for x in items:\n        if x:\n            continue\n        break\n    else:\n        return 2\n    return 1\nexample([])'
    value=client.post('/api/flowchart',json={'code':source}).json()
    graph=value['mermaid']
    assert 'Function example' in graph and 'continue' in graph and 'break' in graph
    assert '|Iterate|' in graph and '|Finished|' in graph
    assert 'Return to caller' in graph


def test_ast_labels_cannot_inject_html_or_directives(setup):
    client,_,_=setup
    value=client.post('/api/flowchart',json={'code':'x = "<script>alert(1)</script> %%{init: evil}"'}).json()
    assert '<script>' not in value['mermaid']
    assert '&lt;script&gt;' in value['mermaid']


def test_large_flowchart_friendly_error(setup):
    client,_,_=setup
    response=client.post('/api/flowchart',json={'code':'\n'.join('x=1' for _ in range(300))})
    assert response.status_code==422 and 'smaller' in response.json()['detail']


def test_unsupported_blocks_disclosed(setup):
    client,_,_=setup
    result=client.post('/api/flowchart',json={'code':'try:\n    x=1\nexcept Exception:\n    pass'}).json()
    assert any('collapsed' in note for note in result['notes'])


def test_legacy_kannada_is_forced_to_english(setup):
    client,provider,_=setup;provider.outputs=[json.dumps(quiz())]
    assert client.post('/api/quiz',json={'code':'x=1','mode':'intermediate','language':'Kannada'}).status_code==200
    context=json.loads(provider.messages[1]['content'])
    assert context['mode']=='intermediate' and context['language']=='English'


def test_corrections_are_not_executed_or_written(setup,tmp_path):
    client,provider,_=setup;value=issues();target=tmp_path/'never-created'
    value['issues'][0]['corrected_example']=f'open({str(target)!r},"w").write("unsafe")'
    provider.outputs=[json.dumps(value)]
    assert client.post('/api/issues',json={'code':'x=1'}).status_code==200
    assert not target.exists()
