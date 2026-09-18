# API Documentation & Contract Specification
## Taneja Power CRM & Enterprise Engineering Platform

This document is the complete, authoritative REST API specification for the Taneja Power CRM backend. Every single endpoint across all 10 domain modules is documented with its HTTP method, URL, role permissions, request parameter schemas, complete JSON request payloads, and standardized JSON success/error response envelopes.

---

## 1. General Conventions & Protocol Standards

- **Base URL**: `http://localhost:5000/api/v1` (Development) / `https://api.tanejapower.com/api/v1` (Production)
- **Data Exchange Format**: `application/json; charset=utf-8` (or `application/pdf` for binary document streaming)
- **Authentication**: JWT Bearer token passed via header:
  ```http
  Authorization: Bearer <ACCESS_TOKEN>
  ```
  or via HTTP-only `accessToken` session cookies.

---

## 2. Standard Envelope Specifications

### 2.1 Standard Success Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Resource fetched or created successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### 2.2 Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "items.0.unitPrice",
        "message": "Unit price must be a positive number"
      }
    ]
  },
  "message": "Invalid input parameters"
}
```

---

## 3. Module 1: Authentication (`/api/v1/auth`)

### 3.1 Register User
- **Method / Path**: `POST /api/v1/auth/register`
- **Auth / Role**: Public (No auth)
- **Request Payload**:
```json
{
  "fullName": "Rahul Patel",
  "email": "rahul.patel@tanejapower.com",
  "password": "SecurePassword123!",
  "phone": "+91 98765 43210",
  "role": "SALES"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Rahul Patel",
      "email": "rahul.patel@tanejapower.com",
      "phone": "+91 98765 43210",
      "role": "SALES",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "User registered successfully"
}
```

### 3.2 Login
- **Method / Path**: `POST /api/v1/auth/login`
- **Auth / Role**: Public
- **Request Payload**:
```json
{
  "email": "rahul.patel@tanejapower.com",
  "password": "SecurePassword123!"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Rahul Patel",
      "email": "rahul.patel@tanejapower.com",
      "role": "SALES"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### 3.3 Get Current User Profile
- **Method / Path**: `GET /api/v1/auth/me`
- **Auth / Role**: Authenticated (All Roles)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fullName": "Rahul Patel",
    "email": "rahul.patel@tanejapower.com",
    "phone": "+91 98765 43210",
    "role": "SALES",
    "isActive": true,
    "createdAt": "2026-09-01T08:00:00.000Z"
  },
  "message": "Profile fetched successfully"
}
```

### 3.4 Refresh Token
- **Method / Path**: `POST /api/v1/auth/refresh`
- **Auth / Role**: Public (Requires refresh token in body or cookies)
- **Request Payload**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

### 3.5 Logout
- **Method / Path**: `POST /api/v1/auth/logout`
- **Auth / Role**: Authenticated (All Roles)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

## 4. Module 2: Enterprise Quotations (`/api/v1/quotations`)

### 4.1 List Quotations
- **Method / Path**: `GET /api/v1/quotations`
- **Auth / Role**: Authenticated (All Roles)
- **Query Parameters**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
  - `search` (string, optional: search in quotation number, subject, or customer name)
  - `status` (string, optional: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SENT`, `ACCEPTED`, `EXPIRED`)
  - `quotationType` (string, optional: `PRODUCT`, `TECHNICAL`, `SERVICE`, `AMC`)
  - `customerId` (UUID, optional)
  - `salespersonId` (UUID, optional)
  - `startDate` / `endDate` (ISO date string, optional)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
      "quotationNumber": "QT/2026-27/0001",
      "quotationType": "PRODUCT",
      "status": "APPROVED",
      "currentRevisionNumber": 1,
      "createdAt": "2026-09-18T10:00:00.000Z",
      "customer": {
        "id": "d8f08722-1d54-47c3-a3d8-552be8b7b251",
        "name": "Adani Green Energy Ltd",
        "companyName": "Adani Green Energy Ltd"
      },
      "salesperson": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "fullName": "Rahul Patel"
      },
      "currentRevision": {
        "revisionNumber": 1,
        "status": "APPROVED",
        "subtotal": "100000.00",
        "totalDiscount": "14500.00",
        "taxableAmount": "85500.00",
        "totalTax": "15390.00",
        "grandTotal": "103390.00",
        "validUntil": "2026-10-18T10:00:00.000Z"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "message": "Quotations fetched successfully"
}
```

### 4.2 Create Initial Quotation (Revision 1)
- **Method / Path**: `POST /api/v1/quotations`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER`, `SALES`)
- **Request Payload**:
```json
{
  "quotationType": "PRODUCT",
  "customerId": "d8f08722-1d54-47c3-a3d8-552be8b7b251",
  "destinationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "salespersonId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "validityDays": 30,
  "currency": "INR",
  "subject": "Supply & Installation of 500 kVA Heavy Duty Diesel Generator Set",
  "paymentTerms": "50% Advance with purchase order, 50% prior to dispatch",
  "deliveryTerms": "3-4 Weeks from technically and commercially clear order",
  "warrantyTerms": "24 Months or 2000 operating hours from commissioning",
  "termsAndConditions": "1. Prices Ex-Works Vadodara. 2. Transit insurance extra at actuals.",
  "freightCharges": "2500.00",
  "otherCharges": "0.00",
  "items": [
    {
      "productId": "e1f1816e-41a2-4a4b-9706-53841804b901",
      "productName": "500 kVA Silent Diesel Generator Set",
      "productSku": "GEN-500-SLNT",
      "hsnSac": "85021310",
      "quantity": 1,
      "unit": "SET",
      "unitPrice": 90000.00,
      "discountPercent": 15.0,
      "gstRate": 18.0,
      "technicalSpecifications": "Cummins QSK19-G4 engine coupled with Stamford alternator, IP23 acoustic canopy, 75 dBA @ 1m."
    },
    {
      "productName": "On-Site Installation & Commissioning Kit",
      "productSku": "SRV-INST-500",
      "hsnSac": "9987",
      "quantity": 1,
      "unit": "LOT",
      "unitPrice": 10000.00,
      "discountPercent": 10.0,
      "gstRate": 18.0
    }
  ]
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "quotationNumber": "QT/2026-27/0001",
    "quotationType": "PRODUCT",
    "status": "DRAFT",
    "currentRevisionNumber": 1,
    "currentRevision": {
      "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "revisionNumber": 1,
      "status": "DRAFT",
      "subtotal": "100000.00",
      "totalDiscount": "14500.00",
      "taxableAmount": "85500.00",
      "cgstAmount": "7695.00",
      "sgstAmount": "7695.00",
      "igstAmount": "0.00",
      "totalTax": "15390.00",
      "freightCharges": "2500.00",
      "roundOff": "0.00",
      "grandTotal": "103390.00",
      "amountInWords": "One Lakh Three Thousand Three Hundred Ninety Indian Rupees Only"
    }
  },
  "message": "Quotation created successfully"
}
```

### 4.3 Get Detailed Quotation by ID
- **Method / Path**: `GET /api/v1/quotations/:id`
- **Auth / Role**: Authenticated (All Roles)
- **Path Parameters**: `id` (UUID)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "quotationNumber": "QT/2026-27/0001",
    "quotationType": "PRODUCT",
    "status": "APPROVED",
    "currentRevisionNumber": 1,
    "customer": {
      "id": "d8f08722-1d54-47c3-a3d8-552be8b7b251",
      "name": "Adani Green Energy Ltd",
      "companyName": "Adani Green Energy Ltd",
      "taxNumber": "24AAACA1234F1Z1"
    },
    "destination": {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Khavda Renewable Park Site",
      "address": "Plot 42, Khavda",
      "city": "Kutch",
      "state": "Gujarat",
      "pincode": "370510"
    },
    "salesperson": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "fullName": "Rahul Patel",
      "email": "rahul.patel@tanejapower.com"
    },
    "currentRevision": {
      "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
      "revisionNumber": 1,
      "status": "APPROVED",
      "subtotal": "100000.00",
      "totalDiscount": "14500.00",
      "taxableAmount": "85500.00",
      "cgstAmount": "7695.00",
      "sgstAmount": "7695.00",
      "igstAmount": "0.00",
      "totalTax": "15390.00",
      "freightCharges": "2500.00",
      "roundOff": "0.00",
      "grandTotal": "103390.00",
      "amountInWords": "One Lakh Three Thousand Three Hundred Ninety Indian Rupees Only",
      "items": [
        {
          "id": "8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
          "productName": "500 kVA Silent Diesel Generator Set",
          "productSku": "GEN-500-SLNT",
          "hsnSac": "85021310",
          "unit": "SET",
          "quantity": 1,
          "unitPrice": "90000.00",
          "discountPercent": "15.00",
          "discountAmount": "13500.00",
          "taxableAmount": "76500.00",
          "gstRate": "18.00",
          "cgstAmount": "6885.00",
          "sgstAmount": "6885.00",
          "totalTax": "13770.00",
          "lineTotal": "90270.00"
        }
      ]
    },
    "approvals": [
      {
        "id": "9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d",
        "action": "APPROVED",
        "comments": "Approved corporate package.",
        "actionAt": "2026-09-18T11:30:00.000Z",
        "reviewedBy": {
          "fullName": "Vikram Singh (Director)",
          "email": "vikram.singh@tanejapower.com"
        }
      }
    ]
  },
  "message": "Quotation fetched successfully"
}
```

### 4.4 Branch New Revision (Rev N+1)
- **Method / Path**: `POST /api/v1/quotations/:id/revisions`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER`, `SALES`)
- **Request Payload**:
```json
{
  "revisionReason": "Customer requested 5% additional commercial discount on generator",
  "validityDays": 45,
  "freightCharges": "2000.00",
  "items": [
    {
      "productId": "e1f1816e-41a2-4a4b-9706-53841804b901",
      "productName": "500 kVA Silent Diesel Generator Set",
      "productSku": "GEN-500-SLNT",
      "hsnSac": "85021310",
      "quantity": 1,
      "unit": "SET",
      "unitPrice": 90000.00,
      "discountPercent": 20.0,
      "gstRate": 18.0
    }
  ]
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "currentRevisionNumber": 2,
    "currentRevision": {
      "revisionNumber": 2,
      "status": "DRAFT",
      "subtotal": "90000.00",
      "totalDiscount": "18000.00",
      "taxableAmount": "72000.00",
      "totalTax": "12960.00",
      "grandTotal": "86960.00"
    }
  },
  "message": "Revision 2 created successfully"
}
```

### 4.5 Submit Quotation for Management Review
- **Method / Path**: `POST /api/v1/quotations/:id/submit`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER`, `SALES`)
- **Request Payload**:
```json
{
  "comments": "Please approve 20% high-volume corporate discount."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "status": "PENDING_APPROVAL"
  },
  "message": "Quotation submitted for approval"
}
```

### 4.6 Approve Quotation
- **Method / Path**: `POST /api/v1/quotations/:id/approve`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER` only)
- **Request Payload**:
```json
{
  "comments": "Approved as per executive director authorization."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "status": "APPROVED"
  },
  "message": "Quotation approved successfully"
}
```

### 4.7 Reject Quotation
- **Method / Path**: `POST /api/v1/quotations/:id/reject`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER` only)
- **Request Payload**:
```json
{
  "comments": "Discount exceeds maximum allowed 15% threshold. Please revise."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "status": "REJECTED"
  },
  "message": "Quotation rejected"
}
```

### 4.8 Stream Authoritative PDF Binary
- **Method / Path**: `GET /api/v1/quotations/:id/pdf` (or `GET /api/v1/quotations/:id/revisions/:revisionNumber/pdf`)
- **Auth / Role**: Authenticated (All Roles)
- **Response Headers**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: inline; filename="Quotation-QT-2026-27-0001-Rev1.pdf"`
- **Response Payload**: Binary Stream (`%PDF-1.4...`)

---

## 5. Module 3: Customers & Multi-Facility Destinations (`/api/v1/customers`)

### 5.1 List Customers
- **Method / Path**: `GET /api/v1/customers`
- **Auth / Role**: Authenticated (All Roles)
- **Query Parameters**: `page`, `limit`, `search`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "d8f08722-1d54-47c3-a3d8-552be8b7b251",
      "name": "Adani Green Energy Ltd",
      "companyName": "Adani Green Energy Ltd",
      "email": "procurement@adani.com",
      "phone": "+91 79 2555 5555",
      "taxNumber": "24AAACA1234F1Z1",
      "panNumber": "AAACA1234F",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "pincode": "382421"
    }
  ],
  "message": "Customers fetched successfully"
}
```

### 5.2 Create Customer
- **Method / Path**: `POST /api/v1/customers`
- **Auth / Role**: Authenticated (`ADMIN` only)
- **Request Payload**:
```json
{
  "name": "Tata Steel Limited",
  "companyName": "Tata Steel Limited",
  "email": "purchase@tatasteel.com",
  "phone": "+91 22 6665 8282",
  "taxNumber": "27AAACT2727Q1ZW",
  "panNumber": "AAACT2727Q",
  "address": "Bombay House, 24 Homi Mody Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
    "name": "Tata Steel Limited",
    "companyName": "Tata Steel Limited"
  },
  "message": "Customer created successfully"
}
```

### 5.3 Register Multi-Facility Destination Site with GPS
- **Method / Path**: `POST /api/v1/customers/:customerId/destinations`
- **Auth / Role**: Authenticated (`ADMIN` only)
- **Path Parameters**: `customerId` (UUID)
- **Request Payload**:
```json
{
  "name": "Tarapur Cold Rolling Plant",
  "address": "Plot MIDC Tarapur Industrial Area",
  "city": "Palghar",
  "state": "Maharashtra",
  "pincode": "401506",
  "latitude": 19.8167,
  "longitude": 72.7000,
  "placeId": "ChIJb8xX_demo_place_id",
  "contactPerson": "Ramesh Kulkarni",
  "contactPhone": "+91 98220 12345",
  "notes": "Gate 3 entry requires safety helmet & PPE.",
  "status": "ACTIVE"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "customerId": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
    "name": "Tarapur Cold Rolling Plant",
    "latitude": "19.8167000",
    "longitude": "72.7000000",
    "placeId": "ChIJb8xX_demo_place_id"
  },
  "message": "Destination created successfully"
}
```

---

## 6. Module 4: Product Catalog & Price Master (`/api/v1/products`)

### 6.1 List Products Catalog
- **Method / Path**: `GET /api/v1/products`
- **Auth / Role**: Public / Authenticated
- **Query Parameters**: `search`, `category`, `page`, `limit`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e1f1816e-41a2-4a4b-9706-53841804b901",
      "name": "Solar Grid Tie Inverter 50 kW",
      "sku": "INV-SOLAR-50KW",
      "category": "INVERTER",
      "unit": "NOS",
      "basePrice": "120000.00",
      "hsnCode": "85044090",
      "gstRate": "12.00",
      "isActive": true
    }
  ],
  "message": "Products fetched successfully"
}
```

### 6.2 Create Product Entry
- **Method / Path**: `POST /api/v1/products`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER`)
- **Request Payload**:
```json
{
  "name": "Active Harmonic Filter 100A",
  "sku": "FLT-ACTIVE-100A",
  "category": "POWER_QUALITY",
  "unit": "LOT",
  "basePrice": "85000.00",
  "hsnCode": "998719",
  "gstRate": "18.00",
  "description": "Active Harmonic Filter 100A 415V 3P4W, Selective mitigation up to 50th order."
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
    "sku": "FLT-ACTIVE-100A",
    "name": "Active Harmonic Filter 100A"
  },
  "message": "Product created successfully"
}
```

---

## 7. Module 5: Geocoding & Address Autocomplete (`/api/v1/geocoding`)

### 7.1 Autocomplete Address Search
- **Method / Path**: `GET /api/v1/geocoding/search`
- **Auth / Role**: Authenticated (All Roles)
- **Query Parameters**:
  - `q` (string, required, min length 3: e.g. `"Dhyan Residency near Harni Water Tank Vadodara"`)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "provider": "google",
    "results": [
      {
        "id": "ChIJD7demo...",
        "provider": "google",
        "placeId": "ChIJD7demo...",
        "displayName": "Dhyan Residency, Harni, Vadodara, Gujarat 390022, India",
        "name": "Dhyan Residency",
        "formattedAddress": "Harni Road, Vadodara, Gujarat, India",
        "city": "Vadodara",
        "state": "Gujarat",
        "pincode": "390022",
        "country": "India",
        "latitude": 22.3312000,
        "longitude": 73.2089000
      }
    ]
  },
  "message": "Locations fetched successfully"
}
```

---

## 8. Module 6: Field Tasks & Live Route Telemetry (`/api/v1/tasks`)

### 8.1 Create Field Task Dispatch
- **Method / Path**: `POST /api/v1/tasks`
- **Auth / Role**: Authenticated (`ADMIN`, `MANAGER`)
- **Request Payload**:
```json
{
  "title": "Substation Harmonic Audit & Inverter Commissioning",
  "description": "Perform power quality analysis and test 50kW solar inverter grid synchronization.",
  "priority": "HIGH",
  "customerId": "d8f08722-1d54-47c3-a3d8-552be8b7b251",
  "destinationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "assignedTo": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "scheduledDate": "2026-09-20T09:00:00.000Z"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "title": "Substation Harmonic Audit & Inverter Commissioning",
    "status": "ASSIGNED"
  },
  "message": "Task created successfully"
}
```

### 8.2 Field Engineer Starts Work Order
- **Method / Path**: `POST /api/v1/tasks/:id/start`
- **Auth / Role**: Authenticated (Assigned Engineer / Admin)
- **Request Payload**:
```json
{
  "latitude": 22.3072,
  "longitude": 73.1812
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "status": "IN_PROGRESS"
  },
  "message": "Task started successfully"
}
```

### 8.3 Stream Live GPS Telemetry Point
- **Method / Path**: `POST /api/v1/tasks/:id/location`
- **Auth / Role**: Authenticated (Assigned Engineer)
- **Request Payload**:
```json
{
  "latitude": 22.3150,
  "longitude": 73.1950,
  "accuracy": 5.4,
  "speed": 35.2,
  "heading": 85.0
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "taskId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "distanceToDestinationMeters": 1420.5
  },
  "message": "Location updated"
}
```

### 8.4 Complete Field Task
- **Method / Path**: `POST /api/v1/tasks/:id/complete`
- **Auth / Role**: Authenticated (Assigned Engineer / Admin)
- **Request Payload**:
```json
{
  "completionNotes": "Harmonic audit completed successfully. THD within IEEE 519 standards.",
  "latitude": 22.3312,
  "longitude": 73.2089
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "status": "COMPLETED"
  },
  "message": "Task completed successfully"
}
```

---

## 9. Module 7: Employee Attendance & Geolocation (`/api/v1/attendance`)

### 9.1 Attendance Check-In
- **Method / Path**: `POST /api/v1/attendance/check-in`
- **Auth / Role**: Authenticated (Field Staff / Employee)
- **Request Payload**:
```json
{
  "latitude": 22.3072,
  "longitude": 73.1812,
  "notes": "Starting duty at Vadodara Industrial Base."
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
    "checkInTime": "2026-09-18T09:00:00.000Z",
    "checkInLatitude": "22.3072000",
    "checkInLongitude": "73.1812000"
  },
  "message": "Checked in successfully"
}
```

### 9.2 Attendance Check-Out
- **Method / Path**: `POST /api/v1/attendance/check-out`
- **Auth / Role**: Authenticated (Field Staff / Employee)
- **Request Payload**:
```json
{
  "latitude": 22.3075,
  "longitude": 73.1810,
  "notes": "Completed shift."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
    "checkOutTime": "2026-09-18T18:00:00.000Z",
    "totalHours": 9.0
  },
  "message": "Checked out successfully"
}
```

---

## 10. Module 8: CRM Deals Pipeline & Leads (`/api/v1/leads`)

### 10.1 Create Sales Opportunity Lead
- **Method / Path**: `POST /api/v1/leads`
- **Auth / Role**: Authenticated (All Roles)
- **Request Payload**:
```json
{
  "title": "11kV Substation Refurbishment Project",
  "contactName": "Chintan Shah",
  "companyName": "Gujarat Heavy Chemicals Ltd",
  "email": "chintan@ghcl.co.in",
  "phone": "+91 98980 12345",
  "estimatedBudget": "4500000.00",
  "stage": "QUALIFIED",
  "source": "DIRECT_INQUIRY"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
    "title": "11kV Substation Refurbishment Project",
    "stage": "QUALIFIED"
  },
  "message": "Lead created successfully"
}
```

### 10.2 Get Kanban Pipeline Aggregations
- **Method / Path**: `GET /api/v1/leads/pipeline`
- **Auth / Role**: Authenticated (All Roles)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "NEW": [],
    "QUALIFIED": [
      {
        "id": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
        "title": "11kV Substation Refurbishment Project",
        "estimatedBudget": "4500000.00",
        "companyName": "Gujarat Heavy Chemicals Ltd"
      }
    ],
    "PROPOSAL_SENT": [],
    "WON": []
  },
  "message": "Pipeline fetched successfully"
}
```

---

## 11. Module 9: WhatsApp Notification Gateway (`/api/v1/whatsapp`)

### 11.1 Check WhatsApp Gateway Connection Status
- **Method / Path**: `GET /api/v1/whatsapp/status`
- **Auth / Role**: Authenticated (`ADMIN` only)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "phoneNumber": "+919876543210",
    "batteryLevel": 98
  },
  "message": "WhatsApp status fetched"
}
```

---

## 12. Module 10: Employees Administration (`/api/v1/employees`)

### 12.1 Register Employee Profile
- **Method / Path**: `POST /api/v1/employees`
- **Auth / Role**: Authenticated (`ADMIN` only)
- **Request Payload**:
```json
{
  "fullName": "Dharmesh Soni",
  "email": "dharmesh.soni@tanejapower.com",
  "phone": "+91 98250 54321",
  "role": "ENGINEER",
  "department": "FIELD_OPERATIONS",
  "designation": "Senior Substation Commissioning Engineer"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
    "fullName": "Dharmesh Soni",
    "role": "ENGINEER"
  },
  "message": "Employee registered successfully"
}
```
