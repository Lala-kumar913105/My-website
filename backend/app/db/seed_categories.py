from sqlalchemy.orm import Session
from app import models


def seed_categories(db: Session) -> None:
    if db.query(models.Category).first():
        return

    category_entries = [
        {"name": "Food", "type": "product", "icon": "🍲"},
        {"name": "Clothes", "type": "product", "icon": "👕"},
        {"name": "Sabji Fruits", "type": "product", "icon": "🥦"},
        {"name": "Electronics", "type": "product", "icon": "📱"},
        {"name": "Handmade", "type": "product", "icon": "🧵"},
        {"name": "Hotel Room", "type": "service", "icon": "🏨"},
        {"name": "Taxi Auto", "type": "service", "icon": "🚕"},
        {"name": "Bus Ticket", "type": "service", "icon": "🎟️"},
        {"name": "Doctor Salon", "type": "service", "icon": "💇"},
        {"name": "Freelancer", "type": "service", "icon": "💼"},
    ]

    def create_category(entry: dict, parent: models.Category | None = None) -> models.Category:
        category = models.Category(
            name=entry["name"],
            type=entry.get("type", "product"),
            icon=entry.get("icon"),
            parent=parent,
        )
        db.add(category)
        db.flush()
        for child in entry.get("children", []) or []:
            create_category(child, parent=category)
        return category

    for entry in category_entries:
        create_category(entry)

    db.commit()