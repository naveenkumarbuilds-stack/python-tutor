import pytest
from fastapi.testclient import TestClient
from backend.main import create_app, MAX_BODY_BYTES


@pytest.fixture
def client():
    with TestClient(create_app('1000/minute')) as client:
        yield client


def test_health(client):
    assert client.get('/api/health').json()['executes_code'] is False


def test_valid_structure(client):
    result = client.post('/api/analyze', json={'code': 'import math as m\nx = 0\nfor i in range(5):\n    if i > 1:\n        x += i'}).json()
    assert result['syntax_valid']
    assert result['imports'][0]['names'] == [{'name': 'math', 'alias': 'm'}]
    assert result['loops'][0]['start_line'] == 3
    assert result['conditionals'][0]['start_line'] == 4
    assert {'x', 'i'} <= {v['name'] for v in result['variables']}
    assert result['complexity']['confidence'] == 'heuristic'


def test_invalid_code(client):
    result = client.post('/api/analyze', json={'code': 'def broken(:\n    pass'}).json()
    assert result['syntax_valid'] is False
    assert result['syntax_error']['line'] == 1
    assert result['syntax_error']['col'] > 0


@pytest.mark.parametrize('code', ['', '  \n\t'])
def test_empty(client, code):
    assert client.post('/api/analyze', json={'code': code}).status_code == 422


@pytest.mark.parametrize('code', ['x' * 102401, '#'+ 'ಅ' * 35000])
def test_oversized_utf8(client, code):
    assert client.post('/api/analyze', json={'code': code}).status_code == 413


def test_exact_size(client):
    assert client.post('/api/analyze', json={'code': '#' + 'x' * 102399}).status_code == 200


def test_nested_functions(client):
    result = client.post('/api/analyze', json={'code': 'def outer(a, /, *args, b=1, **kwargs):\n    def inner(x):\n        return x\n    return inner(a)'}).json()
    assert [f['qualified_name'] for f in result['functions']] == ['outer', 'outer.inner']
    assert result['functions'][0]['args'] == ['a', '*args', 'b', '**kwargs']
    assert result['functions'][1]['start_line'] == 2
    assert result['functions'][1]['end_line'] == 3


@pytest.mark.parametrize('body', [{}, {'code': 123}, {'code': 'x=1', 'extra': 1}])
def test_request_shape(client, body):
    assert client.post('/api/analyze', json=body).status_code == 422


def test_transport_limit(client):
    assert client.post('/api/analyze', content=b' ' * (MAX_BODY_BYTES+1)).status_code == 413


def test_malformed_json(client):
    response = client.post('/api/analyze', content='{secret', headers={'Content-Type': 'application/json'})
    assert response.status_code == 422
    assert 'secret' not in response.text


def test_no_execution(client, tmp_path):
    target = tmp_path / 'must-not-exist.txt'
    code = f'from pathlib import Path\nPath({str(target)!r}).write_text("unsafe")\nraise RuntimeError("should never run")'
    assert client.post('/api/analyze', json={'code': code}).json()['syntax_valid']
    assert not target.exists()


def test_rate_limit():
    with TestClient(create_app('2/minute')) as client:
        for _ in range(2):
            assert client.post('/api/analyze', json={'code':'x=1'}).status_code == 200
        response = client.post('/api/analyze', json={'code':'x=1'})
        assert response.status_code == 429
        assert response.headers['retry-after'] == '60'


def test_cors(client):
    response = client.options('/api/analyze', headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'POST'})
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'
    response = client.options('/api/analyze', headers={'Origin':'https://untrusted.invalid','Access-Control-Request-Method':'POST'})
    assert 'access-control-allow-origin' not in response.headers


def test_comprehension_and_unknown_cost(client):
    result = client.post('/api/analyze', json={'code':'x = [i*j for i in items for j in items]'}).json()
    assert result['complexity']['loop_nesting'] == 2
    result = client.post('/api/analyze', json={'code':'while True:\n    pass'}).json()
    assert result['complexity']['estimate'] == 'Unknown'
