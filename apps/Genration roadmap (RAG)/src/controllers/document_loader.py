# 1. Implement a class to handle diverse file formats (PDF, DOCX, JPG).
from langchain_community.document_loaders import JSONLoader, PyPDFLoader,Docx2txtLoader,TextLoader
from langchain_community.document_loaders.csv_loader import CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import cv2      
import pytesseract
import numpy as np
import json
from langchain_core.documents import Document


class DocumentLoader:
    
    def __init__(self,file_path):
        self.file_path = file_path

# 2. Logic for OCR (Optical Character Recognition) to extract text from images/scans.

    def ocr_image(self):
        image = cv2.imread(self.file_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        coords = np.column_stack(np.where(thresh > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        (h, w) = gray.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        deskewed = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

        custom_config = r'--oem 3 --psm 6'
        
        raw_text = pytesseract.image_to_string(deskewed, config=custom_config)
        
        raw_text = raw_text.replace("-\n", "")

        return [Document(page_content=raw_text , metadata = {"source":self.file_path})]
    

    def load_files(self):

        ext = self.file_path.lower().strip().strip('"').strip("'")
        if ext.endswith(".pdf"):
            return PyPDFLoader(self.file_path).load()
        
        elif ext.endswith((".docx", ".doc")):
            return Docx2txtLoader(self.file_path).load()
        
        elif ext.endswith(".txt"):
            return TextLoader(self.file_path).load()
        
        elif ext.endswith((".jpg", ".jpeg", ".png")):
            return self.ocr_image()
        
        elif ext.endswith(".csv"):
            from langchain_community.document_loaders import CSVLoader
            
            try:
                return CSVLoader(self.file_path, encoding="utf-8").load()
            except UnicodeDecodeError:
                pass
            
            try:
                return CSVLoader(self.file_path, encoding="utf-8-sig").load()
            except UnicodeDecodeError:
                pass
            
            try:
                return CSVLoader(self.file_path, encoding="cp1252").load()
            except Exception as e:
                raise ValueError(f"Failed to load CSV due to encoding or format error: {str(e)}")
        elif ext.endswith(".json"):
            return JSONLoader(self.file_path, jq_schema=".[]", text_content=False, json_lines=True).load()
        else:
            raise ValueError(f"Unsupported file format: {ext}")
        
        


# 3. Define the 'Chunking' strategy (Recursive Character Splitting).
    def process_file_content(self, file_content:list,
                             chunk_size:int = 4000,overlap_size:int = 200):
        
        if not file_content:
            return [] 

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size = chunk_size,
            chunk_overlap = overlap_size,
            length_function = len,
            separators=["\n\n", "\n", " ", ""],
        )
        
        chunks = text_splitter.split_documents(file_content)

        return  chunks


def load_chunks(file_path:str):
        
        with open(file_path, "r", encoding="utf-8") as file:
            loaded_data = json.load(file)

        loaded_chunks = [Document(page_content=chunk["page_content"],metadata=chunk["metadata"]) for chunk in loaded_data]

        return loaded_chunks
    
