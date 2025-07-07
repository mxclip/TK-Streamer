import enum
from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class UserRole(str, enum.Enum):
    admin = "admin"
    streamer = "streamer"


class ScriptType(str, enum.Enum):
    hook = "hook"
    look = "look"
    story = "story"
    value = "value"
    cta = "cta"


# Account model - User accounts with role-based access
class AccountBase(SQLModel):
    name: str = Field(max_length=255)
    email: str = Field(unique=True, index=True, max_length=255)
    role: UserRole = Field(default=UserRole.streamer)


class Account(AccountBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    
    # Relationships
    bags: list["Bag"] = Relationship(back_populates="account")
    phrase_maps: list["PhraseMap"] = Relationship(back_populates="account")


class AccountCreate(AccountBase):
    password: str


class AccountRead(AccountBase):
    id: int
    is_active: bool


class AccountUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# Bag model - Luxury bags inventory
class BagBase(SQLModel):
    brand: str = Field(max_length=100)
    model: str = Field(max_length=100, description="Product name/model")
    color: str = Field(max_length=50)
    condition: str = Field(max_length=50)
    # Extended fields for user requirements
    details: Optional[str] = Field(default=None, max_length=1000, description="Product details and description")
    price: Optional[float] = Field(default=None, ge=0, description="Product price")
    authenticity_verified: bool = Field(default=False, description="Whether authenticity is verified")


class Bag(BagBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="account.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    account: Account = Relationship(back_populates="bags")
    scripts: list["Script"] = Relationship(back_populates="bag")


class BagCreate(BagBase):
    account_id: int


# User-friendly Bag creation model (using 'name' instead of 'model')
class BagCreateUser(SQLModel):
    name: str = Field(max_length=100, description="Product name")
    brand: str = Field(max_length=100)
    color: str = Field(max_length=50)
    details: Optional[str] = Field(default=None, max_length=1000, description="Product details and description")
    price: Optional[float] = Field(default=None, ge=0, description="Product price")
    condition: str = Field(max_length=50, default="Good")
    authenticity_verified: bool = Field(default=False, description="Whether authenticity is verified")


class BagRead(BagBase):
    id: int
    account_id: int
    created_at: datetime
    updated_at: datetime


class BagUpdate(SQLModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    condition: Optional[str] = None
    details: Optional[str] = None
    price: Optional[float] = None
    authenticity_verified: Optional[bool] = None


# Script model - Scripts for each bag
class ScriptBase(SQLModel):
    content: str = Field(max_length=2000)
    script_type: ScriptType = Field(default=ScriptType.hook)
    used_count: int = Field(default=0)
    like_count: int = Field(default=0)


class Script(ScriptBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bag_id: int = Field(foreign_key="bag.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    bag: Bag = Relationship(back_populates="scripts")
    feedbacks: list["Feedback"] = Relationship(back_populates="script")


class ScriptCreate(ScriptBase):
    bag_id: int


class ScriptRead(ScriptBase):
    id: int
    bag_id: int
    created_at: datetime
    updated_at: datetime


class ScriptUpdate(SQLModel):
    content: Optional[str] = None
    script_type: Optional[ScriptType] = None
    used_count: Optional[int] = None
    like_count: Optional[int] = None


# PhraseMap model - Phrase replacement rules
class PhraseMapBase(SQLModel):
    find_phrase: str = Field(max_length=255)
    replace_phrase: str = Field(max_length=255)
    active: bool = Field(default=True)


class PhraseMap(PhraseMapBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="account.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    account: Account = Relationship(back_populates="phrase_maps")


class PhraseMapCreate(PhraseMapBase):
    account_id: int


class PhraseMapRead(PhraseMapBase):
    id: int
    account_id: int
    created_at: datetime


class PhraseMapUpdate(SQLModel):
    find_phrase: Optional[str] = None
    replace_phrase: Optional[str] = None
    active: Optional[bool] = None




# Feedback model - Live feedback for script effectiveness
class FeedbackBase(SQLModel):
    rating: int = Field(ge=-1, le=1)  # 1 👍, -1 👎, 0 neutral
    live_event_ts: datetime = Field(default_factory=datetime.utcnow)
    comment: Optional[str] = Field(default=None, max_length=500)


class Feedback(FeedbackBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    script_id: int = Field(foreign_key="script.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    script: Script = Relationship(back_populates="feedbacks")


class FeedbackCreate(FeedbackBase):
    script_id: int


class FeedbackRead(FeedbackBase):
    id: int
    script_id: int
    created_at: datetime


# WebSocket message models
class WSMessage(SQLModel):
    type: str
    bag_id: Optional[int] = None
    data: Optional[dict] = None


class ScriptBlock(SQLModel):
    id: int
    hook: Optional[str] = None
    look: Optional[str] = None
    story: Optional[str] = None
    value: Optional[str] = None
    cta: Optional[str] = None


class WSScriptMessage(SQLModel):
    bag_id: int
    scripts: list[ScriptBlock] 