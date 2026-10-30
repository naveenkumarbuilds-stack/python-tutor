from io import BytesIO
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
from backend.main import create_app
from backend.imports import MAX_PDF_BYTES
from backend.ai_models import ExplainRequest, ChatRequest
from backend.ai_service import SYSTEM


def program_pdf(text='print(42)',pages=1,encrypted=False):
    writer=PdfWriter()
    for _ in range(pages):
        page=writer.add_blank_page(width=612,height=792)
        if text:
            font=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Courier')})
            page[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):writer._add_object(font)})})
            stream=DecodedStreamObject()
            escaped=text.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
            stream.set_data(('BT /F1 12 Tf 40 700 Td ('+escaped+') Tj ET').encode('ascii'))
            page[NameObject('/Contents')]=writer._add_object(stream)
    if encrypted:writer.encrypt('password')
    output=BytesIO();writer.write(output);return output.getvalue()


@pytest.fixture
def client():
    with TestClient(create_app('1000/minute')) as client:yield client


def test_pdf_extracts_selectable_code(client):
    response=client.post('/api/import-pdf',content=program_pdf(),headers={'Content-Type':'application/pdf'})
    assert response.status_code==200
    assert 'print(42)' in response.json()['text']
    assert response.json()['pages']==1


@pytest.mark.parametrize('content,status',[(b'not pdf',422),(b'%PDF- broken',422),(b'x'*(MAX_PDF_BYTES+1),413)])
def test_invalid_pdf(client,content,status):
    assert client.post('/api/import-pdf',content=content,headers={'Content-Type':'application/pdf'}).status_code==status


def test_scanned_or_empty_pdf_message(client):
    response=client.post('/api/import-pdf',content=program_pdf(text=''),headers={'Content-Type':'application/pdf'})
    assert response.status_code==422 and 'selectable text' in response.json()['detail']


def test_encrypted_pdf_message(client):
    response=client.post('/api/import-pdf',content=program_pdf(encrypted=True),headers={'Content-Type':'application/pdf'})
    assert response.status_code==422 and 'Password-protected' in response.json()['detail']


def test_pdf_page_limit(client):
    response=client.post('/api/import-pdf',content=program_pdf(pages=21),headers={'Content-Type':'application/pdf'})
    assert response.status_code==422 and '20 pages' in response.json()['detail']


def test_pdf_content_type_required(client):
    assert client.post('/api/import-pdf',content=program_pdf(),headers={'Content-Type':'text/plain'}).status_code==415


def test_english_normalizes_stale_settings():
    assert ExplainRequest(code='x=1',language='Kannada').language=='English'
    assert ChatRequest(code='x=1',language='Kannada',message='Explain in Kannada').language=='English'
    assert 'Always answer in English only' in SYSTEM
