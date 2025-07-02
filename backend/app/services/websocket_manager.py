import json
import logging
from datetime import datetime
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from sqlmodel import Session, select

from app.models import Bag, Script, ScriptType, WSMessage, WSScriptMessage, ScriptBlock
from app.core.db import get_session

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.bag_subscriptions: Dict[int, Set[str]] = {}  # bag_id -> set of connection_ids
    
    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connection established: {connection_id}")
    
    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from all bag subscriptions
        for bag_id, subscribers in self.bag_subscriptions.items():
            subscribers.discard(connection_id)
        
        logger.info(f"WebSocket connection closed: {connection_id}")
    
    async def send_personal_message(self, message: dict, connection_id: str):
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def send_to_bag_subscribers(self, message: dict, bag_id: int):
        if bag_id in self.bag_subscriptions:
            subscribers = list(self.bag_subscriptions[bag_id])  # Copy to avoid modification during iteration
            for connection_id in subscribers:
                await self.send_personal_message(message, connection_id)
    
    def subscribe_to_bag(self, connection_id: str, bag_id: int):
        if bag_id not in self.bag_subscriptions:
            self.bag_subscriptions[bag_id] = set()
        self.bag_subscriptions[bag_id].add(connection_id)
        logger.info(f"Connection {connection_id} subscribed to bag {bag_id}")
    
    def unsubscribe_from_bag(self, connection_id: str, bag_id: int):
        if bag_id in self.bag_subscriptions:
            self.bag_subscriptions[bag_id].discard(connection_id)
            if not self.bag_subscriptions[bag_id]:
                del self.bag_subscriptions[bag_id]


manager = ConnectionManager()


def get_scripts_for_bag(bag_id: int, session: Session) -> List[ScriptBlock]:
    """
    Get all scripts for a bag organized into ScriptBlock format.
    """
    statement = select(Script).where(Script.bag_id == bag_id)
    scripts = session.exec(statement).all()
    
    # Group scripts by type
    script_groups = {}
    for script in scripts:
        if script.script_type not in script_groups:
            script_groups[script.script_type] = []
        script_groups[script.script_type].append(script)
    
    # Create script blocks (variations of the same bag)
    script_blocks = []
    
    # Find the maximum number of variations
    max_variations = max(len(scripts) for scripts in script_groups.values()) if script_groups else 0
    
    for i in range(max_variations):
        block = ScriptBlock(id=i + 1)  # 1-indexed for UI
        
        # Get the i-th script for each type (if exists)
        for script_type in ScriptType:
            scripts_of_type = script_groups.get(script_type, [])
            if i < len(scripts_of_type):
                setattr(block, script_type.value, scripts_of_type[i].content)
        
        script_blocks.append(block)
    
    return script_blocks


async def send_scripts_to_teleprompter(bag_id: int, session: Session):
    """
    Send scripts for a specific bag to all subscribed teleprompter clients.
    """
    try:
        script_blocks = get_scripts_for_bag(bag_id, session)
        
        message = WSScriptMessage(
            bag_id=bag_id,
            scripts=script_blocks
        )
        
        ws_message = {
            "type": "scripts",
            "data": message.model_dump()
        }
        
        await manager.send_to_bag_subscribers(ws_message, bag_id)
        logger.info(f"Sent scripts for bag {bag_id} to teleprompter clients")
        
    except Exception as e:
        logger.error(f"Error sending scripts for bag {bag_id}: {e}")


async def send_missing_product_alert(product_title: str):
    """
    Send missing product alert to all connected teleprompter clients.
    """
    try:
        message = {
            "type": "missing_product",
            "data": {
                "title": product_title,
                "message": "SCRIPT MISSING",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        # Send to all active connections
        for connection_id in list(manager.active_connections.keys()):
            await manager.send_personal_message(message, connection_id)
        
        logger.info(f"Sent missing product alert for: {product_title}")
        
    except Exception as e:
        logger.error(f"Error sending missing product alert: {e}")


async def send_switch_command(bag_id: int):
    """
    Send switch command to teleprompter to change to specific bag.
    """
    try:
        message = {
            "type": "switch",
            "data": {
                "bag_id": bag_id,
                "command": "switch_bag"
            }
        }
        
        # Send to all bag subscribers
        await manager.send_to_bag_subscribers(message, bag_id)
        
        # Also send scripts immediately
        session = next(get_session())
        await send_scripts_to_teleprompter(bag_id, session)
        
        logger.info(f"Sent switch command for bag {bag_id}")
        
    except Exception as e:
        logger.error(f"Error sending switch command for bag {bag_id}: {e}")


async def handle_websocket_message(message_data: dict, connection_id: str, session: Session):
    """
    Handle incoming WebSocket messages from teleprompter or other clients.
    """
    try:
        message_type = message_data.get("type")
        data = message_data.get("data", {})
        
        if message_type == "subscribe":
            bag_id = data.get("bag_id")
            if bag_id:
                manager.subscribe_to_bag(connection_id, bag_id)
                
                # Send current scripts immediately
                await send_scripts_to_teleprompter(bag_id, session)
        
        elif message_type == "unsubscribe":
            bag_id = data.get("bag_id")
            if bag_id:
                manager.unsubscribe_from_bag(connection_id, bag_id)
        
        elif message_type == "ping":
            # Respond with pong
            pong_message = {
                "type": "pong",
                "data": {"timestamp": datetime.utcnow().isoformat()}
            }
            await manager.send_personal_message(pong_message, connection_id)
        
        elif message_type == "script_used":
            # Track script usage
            script_id = data.get("script_id")
            if script_id:
                statement = select(Script).where(Script.id == script_id)
                script = session.exec(statement).first()
                if script:
                    script.used_count += 1
                    session.add(script)
                    session.commit()
        
        else:
            logger.warning(f"Unknown message type: {message_type}")
    
    except Exception as e:
        logger.error(f"Error handling WebSocket message: {e}")


async def websocket_endpoint(websocket: WebSocket, connection_id: str = None):
    """
    Main WebSocket endpoint handler.
    """
    if not connection_id:
        connection_id = f"conn_{id(websocket)}"
    
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            session = next(get_session())
            await handle_websocket_message(message_data, connection_id, session)
            
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error for {connection_id}: {e}")
        manager.disconnect(connection_id) 