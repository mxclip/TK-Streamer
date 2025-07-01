from typing import Generator, Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import get_session
from app.core.security import ALGORITHM
from app.models import Account, UserRole

reusable_oauth2 = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """Database dependency."""
    yield from get_session()


def get_current_user(
    session: Annotated[Session, Depends(get_db)],
    token: Annotated[HTTPAuthorizationCredentials, Depends(reusable_oauth2)]
) -> Account:
    """Get current authenticated user from JWT token."""
    try:
        payload = jwt.decode(
            token.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    statement = select(Account).where(Account.id == user_id)
    user = session.exec(statement).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_active_superuser(
    current_user: Annotated[Account, Depends(get_current_user)]
) -> Account:
    """Ensure current user is a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_current_admin_user(
    current_user: Annotated[Account, Depends(get_current_user)]
) -> Account:
    """Ensure current user has admin role."""
    if current_user.role != UserRole.admin and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def get_current_streamer_user(
    current_user: Annotated[Account, Depends(get_current_user)]
) -> Account:
    """Ensure current user has streamer role (or admin/superuser)."""
    if (current_user.role not in [UserRole.streamer, UserRole.admin] 
        and not current_user.is_superuser):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Streamer privileges required"
        )
    return current_user


def get_account_access_filter(
    current_user: Annotated[Account, Depends(get_current_user)]
) -> int:
    """
    Get account filter for data access.
    Admins and superusers can access all data, streamers only their own.
    """
    if current_user.role == UserRole.admin or current_user.is_superuser:
        return None  # No filter, access all accounts
    else:
        return current_user.id  # Filter by current user's account only 