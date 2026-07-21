# Antigravity Project Specification

## Card Consignment Inventory System

> Backend Target: - Frontend: HTML/CSS/JavaScript - Hosting: GitHub
> Pages - Backend: Google Apps Script - Database: Google Sheets - Image
> Storage: Google Drive

## Existing Resources

Use these resources (replace IDs in Apps Script configuration):

-   Image Folder:
    https://drive.google.com/drive/folders/1liegX11st8HsJ5KNAC_gVfHxslThH9N0

-   Login Spreadsheet:
    https://docs.google.com/spreadsheets/d/1Q8BJBbL-Rk0QEq5HeroP4AMM4G3pmI1qW3i9RC7qrvs

-   Data Spreadsheet:
    https://docs.google.com/spreadsheets/d/1CcD1CAkXkus0iHLg4Q07RutGx85nsaB6-hBGPU-qGKI

------------------------------------------------------------------------

# Goal

Build a complete inventory system for a Vanguard card consignment
business.

The system must track:

-   card owner
-   inventory status
-   auction participation
-   sold status
-   shipping status
-   payout status
-   transfer proof
-   shipping receipt
-   promotion banner

------------------------------------------------------------------------

# Pages

## 1. Login

Authentication using Users sheet.

Fields:

-   username
-   password

------------------------------------------------------------------------

## 2. Dashboard

Display:

-   Total Inventory
-   Available Cards
-   Sold Cards
-   Waiting Shipment
-   Waiting Payout
-   Finished Transactions
-   Active Auctions
-   Finished Auctions

Also display current promotion banner.

------------------------------------------------------------------------

## 3. Promotion

CRUD Promotion

Fields:

-   title
-   image
-   description
-   active

Image stored in Google Drive.

------------------------------------------------------------------------

## 4. Inventory (Main Feature)

CRUD Card

Fields:

-   Card ID (auto)
-   Card Name
-   Nation
-   Owner
-   Date Received
-   Image
-   Status

Nation dropdown:

-   Dragon Empire
-   Dark States
-   Stoicheia
-   Lyrical Monasterio
-   Brandt Gate
-   Keter Sanctuary

Status flow

Available

↓

Auction (optional)

↓

Sold

↓

Waiting Shipment

↓

Shipped

↓

Waiting Owner Payment

↓

Completed

When Sold manually ask:

-   Buyer
-   Selling Price
-   Sold Date

Buttons:

Edit

Delete

Mark Sold

------------------------------------------------------------------------

## 5. Auction

CRUD Auction

Fields

-   Facebook Post URL
-   Upload Date (auto)
-   Status

Auction Detail

Select multiple inventory cards.

Finish Auction

For each card choose

-   Sold / Unsold

If sold

-   Buyer
-   Price

Automatically update inventory.

Save auction history.

------------------------------------------------------------------------

## 6. Waiting Shipment

Show sold cards not shipped.

Fields

-   Buyer
-   Shipping Date
-   Tracking Number
-   Shipping Proof Image (optional)

Button

Complete Shipment

After completed

Move card to Waiting Owner Payment.

------------------------------------------------------------------------

## 7. Waiting Owner Payment

Show shipped cards.

Fields

-   Transfer Date
-   Transfer Proof Image

Button

Complete Transaction

Move to Finished.

------------------------------------------------------------------------

## 8. Owner Page

Group inventory by owner.

Display

Owner Name

Available

Sold

Waiting Shipment

Waiting Payment

Completed

Click owner to view cards.

------------------------------------------------------------------------

## Google Sheets Structure

Workbook:

Users

Inventory

Auctions

AuctionItems

Promotions

Shipment

Payments

History

Owners

Logs

Every image field stores Google Drive URL only.

------------------------------------------------------------------------

## Google Apps Script API

POST /login

GET /inventory

POST /inventory

PUT /inventory

DELETE /inventory

GET /auction

POST /auction

POST /auction/finish

GET /owners

POST /shipment

POST /payment

GET /dashboard

------------------------------------------------------------------------

## UI

Modern dashboard

Sidebar

Blue theme

Responsive

Search

Sorting

Pagination

Filter by

Owner

Nation

Status

Date

------------------------------------------------------------------------

## Business Rules

1.  One card belongs to one owner.
2.  One card can join multiple auctions over time.
3.  Sold cards cannot re-enter inventory unless sale is cancelled.
4.  Shipment must be completed before owner payment.
5.  History is immutable.

------------------------------------------------------------------------

# Feasibility

This architecture is feasible using only GitHub Pages + Google Apps
Script + Google Sheets + Google Drive.

Recommended practical limits:

-   5,000--10,000 inventory records
-   Small team (1--5 users)
-   Moderate daily activity

If the business grows significantly, migrate only the backend to
Firebase or Supabase while keeping the same frontend.
