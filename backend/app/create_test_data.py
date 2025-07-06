#!/usr/bin/env python3
"""
Create test data for the TikTok Streamer Backend
"""
import sys
from sqlmodel import Session, select
from app.core.db import engine
from app.models import Account, Bag, Script, ScriptType, PhraseMap


def create_test_data():
    """Create test bags, scripts, and phrase mappings"""
    
    with Session(engine) as session:
        # Get the admin account
        admin = session.exec(select(Account).where(Account.email == "admin@example.com")).first()
        if not admin:
            print("Admin account not found. Please run initial_data.py first.")
            sys.exit(1)
        
        print(f"Using admin account: {admin.email}")
        
        # Test Bags Data
        test_bags = [
            {
                "brand": "Hermès",
                "model": "Birkin 30",
                "color": "Black",
                "condition": "excellent",
                "details": "Togo leather with gold hardware, includes dust bag and box",
                "price": 28500.00,
                "authenticity_verified": True
            },
            {
                "brand": "Chanel",
                "model": "Classic Flap Medium",
                "color": "Navy Blue",
                "condition": "very good",
                "details": "Caviar leather with silver hardware, minor wear on corners",
                "price": 8900.00,
                "authenticity_verified": True
            },
            {
                "brand": "Louis Vuitton",
                "model": "Neverfull MM",
                "color": "Damier Ebene",
                "condition": "good",
                "details": "Classic print with red interior, includes pochette",
                "price": 1850.00,
                "authenticity_verified": True
            },
            {
                "brand": "Gucci",
                "model": "Marmont Small",
                "color": "Pink",
                "condition": "excellent",
                "details": "Matelassé leather with antique gold hardware",
                "price": 2200.00,
                "authenticity_verified": True
            },
            {
                "brand": "Dior",
                "model": "Lady Dior Medium",
                "color": "Red",
                "condition": "very good",
                "details": "Cannage lambskin with gold hardware, includes strap",
                "price": 5800.00,
                "authenticity_verified": True
            }
        ]
        
        # Create bags and scripts
        created_bags = 0
        for bag_data in test_bags:
            # Check if bag already exists
            existing = session.exec(
                select(Bag).where(
                    Bag.brand == bag_data["brand"],
                    Bag.model == bag_data["model"],
                    Bag.account_id == admin.id
                )
            ).first()
            
            if existing:
                print(f"Bag already exists: {bag_data['brand']} {bag_data['model']}")
                continue
            
            # Create bag
            bag = Bag(
                account_id=admin.id,
                **bag_data
            )
            session.add(bag)
            session.commit()
            session.refresh(bag)
            created_bags += 1
            
            # Create scripts for each bag
            scripts = [
                (ScriptType.hook, f"Ladies, feast your eyes on this stunning {bag_data['brand']} {bag_data['model']}! This is not just a bag, it's an investment piece!"),
                (ScriptType.look, f"Look at this gorgeous {bag_data['color']} color! The {bag_data['details'].split(',')[0] if bag_data['details'] else 'craftsmanship'} is absolutely impeccable!"),
                (ScriptType.story, f"This {bag_data['brand']} piece is from their iconic collection. It's a timeless design that never goes out of style and actually increases in value over time!"),
                (ScriptType.value, f"In {bag_data['condition']} condition at only ${bag_data['price']:,.0f}! You won't find this quality anywhere else at this price!"),
                (ScriptType.cta, f"This beauty won't last long! Comment 'MINE' right now to claim it before someone else does!")
            ]
            
            for script_type, content in scripts:
                script = Script(
                    content=content,
                    script_type=script_type,
                    bag_id=bag.id,
                    used_count=0,
                    like_count=0
                )
                session.add(script)
            
            session.commit()
            print(f"Created bag: {bag_data['brand']} {bag_data['model']} with 5 scripts")
        
        # Create test phrase mappings
        test_phrase_maps = [
            ("fake", "high-quality replica"),
            ("copy", "inspired design"),
            ("knock-off", "alternative option"),
            ("used", "pre-loved"),
            ("old", "vintage"),
            ("damaged", "shows character"),
            ("worn", "gently used"),
            ("cheap", "affordable luxury"),
            ("second-hand", "pre-owned"),
            ("replica", "inspired by")
        ]
        
        created_mappings = 0
        for find_phrase, replace_phrase in test_phrase_maps:
            # Check if mapping already exists
            existing = session.exec(
                select(PhraseMap).where(
                    PhraseMap.find_phrase == find_phrase,
                    PhraseMap.account_id == admin.id,
                    PhraseMap.active == True
                )
            ).first()
            
            if existing:
                print(f"Phrase mapping already exists: {find_phrase} -> {replace_phrase}")
                continue
            
            phrase_map = PhraseMap(
                find_phrase=find_phrase,
                replace_phrase=replace_phrase,
                active=True,
                account_id=admin.id
            )
            session.add(phrase_map)
            created_mappings += 1
        
        session.commit()
        
        print(f"\nTest data created successfully!")
        print(f"- Created {created_bags} bags with scripts")
        print(f"- Created {created_mappings} phrase mappings")
        
        # Display summary
        total_bags = session.exec(select(Bag).where(Bag.account_id == admin.id)).all()
        total_scripts = session.exec(
            select(Script).join(Bag).where(Bag.account_id == admin.id)
        ).all()
        total_mappings = session.exec(
            select(PhraseMap).where(
                PhraseMap.account_id == admin.id,
                PhraseMap.active == True
            )
        ).all()
        
        print(f"\nTotal data in database:")
        print(f"- Bags: {len(total_bags)}")
        print(f"- Scripts: {len(total_scripts)}")
        print(f"- Active phrase mappings: {len(total_mappings)}")


if __name__ == "__main__":
    create_test_data() 