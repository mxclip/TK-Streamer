from typing import Annotated
import pandas as pd
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.core.deps import get_db, get_current_user
from app.models import Account, Bag
from app.services.csv_import import import_bags_csv, generate_template_excel

router = APIRouter()


@router.post("/bags/import-csv")
async def import_bags_csv_endpoint(
    session: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Account, Depends(get_current_user)],
    file: UploadFile = File(...)
) -> dict:
    """
    Import bags from CSV or Excel file.
    Required columns: name, brand, price, details, conditions
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded"
        )
    
    # Check file extension
    file_ext = file.filename.lower().split('.')[-1]
    if file_ext not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be CSV or Excel format"
        )
    
    try:
        # Read file content
        contents = await file.read()
        
        # Parse file based on extension
        if file_ext == 'csv':
            df = pd.read_csv(io.BytesIO(contents))
        else:  # Excel
            df = pd.read_excel(io.BytesIO(contents))
        
        # Process the import
        result = import_bags_csv(df, current_user.id, session)
        
        return {
            "message": "Import completed successfully",
            "filename": file.filename,
            "total_rows": result["total_rows"],
            "successful": result["successful"],
            "failed": result["failed"],
            "errors": result["errors"]
        }
        
    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file is empty"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@router.get("/bags/template")
def download_template() -> StreamingResponse:
    """
    Download the CSV/Excel template for bag import.
    """
    # Generate Excel template
    excel_buffer = generate_template_excel()
    
    return StreamingResponse(
        io.BytesIO(excel_buffer),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=bag_import_template.xlsx"
        }
    )


@router.get("/upload/csv/template/{template}")
def get_csv_template_legacy(template: str) -> dict:
    """
    Legacy endpoint - redirects to new template
    """
    return {
        "message": "This endpoint is deprecated. Please use /api/v1/bags/template",
        "new_endpoint": "/api/v1/bags/template"
    } 