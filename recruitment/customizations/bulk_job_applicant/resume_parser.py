import re
import os
import pdfplumber
from docx import Document

def parse_resume(file_path):
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            text = extract_pdf_text(file_path)
        elif ext == '.docx':
            text = extract_docx_text(file_path)
        elif ext == '.txt':
            text = extract_txt_text(file_path)
        elif ext == '.doc':
            text = extract_doc_text(file_path)  # placeholder for future use
        else:
            return {}

        if not text or not text.strip():
            return {}

        return {
            "name": extract_name(text),
            "email": extract_email(text),
            "mobile": extract_mobile(text)
        }
    except Exception as e:
        return {}

def extract_pdf_text(file_path):
    try:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                content = page.extract_text()
                if content:
                    text += content + "\n"
        return text
    except Exception:
        return ""

def extract_docx_text(file_path):
    try:
        doc = Document(file_path)
        return '\n'.join([para.text for para in doc.paragraphs])
    except Exception:
        return ""

def extract_txt_text(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception:
        return ""

def extract_doc_text(file_path):
    # Optional: Add logic for `.doc` using textract or other tool
    return ""

def extract_name(text):
    lines = text.split("\n")
    for line in lines:
        if line.strip() and not re.search(r'(resume|cv|email|phone)', line.lower()):
            return line.strip()
    return None

def extract_email(text):
    match = re.search(r"[\w\.-]+@[\w\.-]+", text)
    if match:
        email = match.group(0).strip()
        # Clean up double @ if any
        email = re.sub(r'@+', '@', email)
        return email
    return None

def extract_mobile(text):
    match = re.search(r'(\+?\d[\d\s\-\(\)]{8,}\d)', text)
    return match.group(0).strip() if match else None
