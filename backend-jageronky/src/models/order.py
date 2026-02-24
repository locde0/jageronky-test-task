#from sqlalchemy import Column, Integer, String, DateTime
#from sqlalchemy.types import Numeric
#from sqlalchemy.sql import func
#from db.database import Base

#class Order(Base):
#    __tablename__ = "orders"

#    id = Column(Integer, primary_key=True)
#    latitude = Column(Numeric(9,6), nullable=False)
#    longitude = Column(Numeric(9,6), nullable=False)
#    subtotal = Column(Numeric(10,2), nullable=False)

#    county = Column(String, nullable=False)

#    composite_tax_rate = Column(Numeric(5,4), nullable=False)
#    tax_amount = Column(Numeric(10,2), nullable=False)
#    total_amount = Column(Numeric(10,2), nullable=False)

#    created_at = Column(DateTime(timezone=True), server_default=func.now())