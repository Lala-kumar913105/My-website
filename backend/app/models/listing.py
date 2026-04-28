from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    type = Column(String, nullable=False, index=True)  # "product" | "service"
    stock = Column(Integer, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    source_id = Column(Integer, nullable=True)
    source_type = Column(String, nullable=True)  # "product" | "service"

    seller = relationship("Seller", backref="listings")