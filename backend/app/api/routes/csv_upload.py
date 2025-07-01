from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.deps import get_db, get_current_admin_user, get_account_access_filter
from app.models import Account
from app.services.csv_import import import_csv, generate_template_csv, CSVImportError

router = APIRouter()


@router.post("/upload/csv")
async def upload_csv(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_admin_user)],
    template: Annotated[str, Form()],
    file: UploadFile = File(...)
) -> dict:
    """
    Upload and process CSV file for bags and scripts.
    
    Query Parameters:
    - template: 'a' for scripts only, 'b' for bags + scripts
    
    Template A (scripts only): bag_id,script_text
    Template B (bags + scripts): bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text
    """
    if template.lower() not in ["a", "b"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template must be 'a' or 'b'"
        )
    
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded"
        )
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    try:
        # Read CSV content
        contents = await file.read()
        csv_content = contents.decode('utf-8')
        
        # Process CSV
        result = import_csv(csv_content, template, current_user.id, session)
        
        return {
            "message": "CSV imported successfully",
            "filename": file.filename,
            "template": template.upper(),
            "result": result
        }
        
    except CSVImportError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CSV encoding. Please use UTF-8."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CSV: {str(e)}"
        )


@router.get("/upload/csv/template/{template}")
def get_csv_template(template: str) -> dict:
    """
    Get sample CSV template for the specified format.
    
    Path Parameters:
    - template: 'a' for scripts only, 'b' for bags + scripts
    """
    if template.lower() not in ["a", "b"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template must be 'a' or 'b'"
        )
    
    try:
        sample_csv = generate_template_csv(template)
        
        return {
            "template": template.upper(),
            "description": (
                "Template A: Add scripts to existing bags" if template.lower() == "a"
                else "Template B: Create/update bags with scripts"
            ),
            "headers": (
                "bag_id,script_text" if template.lower() == "a"
                else "bag_id,brand,model,color,condition,hook_text,look_text,story_text,value_text,cta_text"
            ),
            "sample_csv": sample_csv.strip(),
            "usage_notes": [
                "All text will be processed through phrase mapping rules",
                "Empty script fields will be skipped",
                "Existing records will be updated (UPSERT pattern)",
                "Warnings will be generated for potential Chinglish terms"
            ]
        }
        
    except CSVImportError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 