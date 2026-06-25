-- Paddy's Pub config snapshot — restored by purge-bookings.sh every 2 hours.
-- Edit this file to update what gets restored. Do NOT add Bookings/PII here.

PRAGMA foreign_keys = OFF;

DELETE FROM Highlights;
DELETE FROM Tables;
DELETE FROM Sections;
DELETE FROM Restaurants;
DELETE FROM BrandSettings;
DELETE FROM EmailSettings;
DELETE FROM sqlite_sequence WHERE name IN (
  'Highlights', 'Tables', 'Sections', 'Restaurants', 'BrandSettings', 'EmailSettings'
);

-- Brand
INSERT INTO BrandSettings VALUES(1,'Paddy''s Pub','#059669',NULL,NULL,'/media/hero.jpg?v=1780749336371','pizza','https://openres.to');

-- Email settings intentionally left empty (no credentials in source control)

-- Restaurants
INSERT INTO Restaurants VALUES(1,'Paddy''s Pub','346 W Girard Ave, Philadelphia, PA','09:00','23:45','1,2,3,4,5,6','America/Toronto',NULL,'mac and cheese,fight milk','/media/location-1.jpg?v=1779668717048',0);
INSERT INTO Restaurants VALUES(2,'Paddy''s Pub Toronto','The Alley Behind the Alley, Toronto, ON','09:00','23:45','3,4,5,6','America/Toronto',NULL,'charlie work,mantis toboggan','/media/location-2.webp',0);
INSERT INTO Restaurants VALUES(3,'Paddy''s Pub (Vancouver)','Multiple Areas, please don''t ask','00:00','23:00','1,2,3,4,5,6,7','America/Los_Angeles','2026-06-01 14:24:27.6555714','wolf cola,dennis system','/media/location-3.jpg?v=1780155462249',0);

-- Sections
INSERT INTO Sections VALUES(1,'Indoor',1);
INSERT INTO Sections VALUES(2,'Patio',1);
INSERT INTO Sections VALUES(3,'Bar',2);
INSERT INTO Sections VALUES(4,'The Bar',3);
INSERT INTO Sections VALUES(5,'Tables',2);

-- Tables
INSERT INTO Tables VALUES(1,'T1',4,1);
INSERT INTO Tables VALUES(2,'T2',2,1);
INSERT INTO Tables VALUES(3,'P1',4,2);
INSERT INTO Tables VALUES(4,'B1',2,3);
INSERT INTO Tables VALUES(5,'B2',2,3);
INSERT INTO Tables VALUES(6,'Bar Table',2,4);
INSERT INTO Tables VALUES(7,'B3',1,3);
INSERT INTO Tables VALUES(8,'Table 1',4,5);

-- Highlights
INSERT INTO Highlights VALUES(1,'Dayman Live Every Friday','Fighter of the Nightman. No cover charge. Cash only. Residency secured after a lengthy legal dispute.','star-outline',0);
INSERT INTO Highlights VALUES(2,'Frank''s Famous Rum Ham','A Reynolds family tradition since 1981. Seasonal availability. Do not ask about the ingredients. Do not ask where Frank has been.','pizza-outline',1);
INSERT INTO Highlights VALUES(3,'Chardee MacDennis','The Game of Games. Teams of 2. Bring your own wine glass to smash. Management not responsible for emotional damage.','gift-outline',2);
INSERT INTO Highlights VALUES(4,'Milk Steak - Our Signature Dish','Boiled over hard, served with a side of your finest jelly beans. Charlie''s personal recipe. Our most polarising menu item. Loved by ghouls.','nutrition-outline',3);

PRAGMA foreign_keys = ON;
