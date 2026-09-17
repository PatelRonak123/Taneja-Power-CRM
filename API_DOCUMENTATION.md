# API Documentation & Contract Specification

This document details the REST API specifications, envelope formats, authentication standards, error schemas, and endpoint contracts for the Taneja Power CRM & Field Workforce Management System.

---

## 1. General API Conventions

- **Base URL**: `http://localhost:5000/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: JWT Bearer Token passed via HTTP header:
  `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  or via HTTP-only session cookies.

---

## 2. Standard API Response Envelope

Every endpoint in the system returns a predictable, standardized envelope for consistent client-side parsing.

### Success Response Envelope

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "latitude",
        "message": "Latitude must be a number between -90 and 90"
      }
    ]
  },
  "message": "Invalid input parameters"
}
```

---

## 3. Standard HTTP Status Codes

| Status Code | Code Identifier | Description |
| :--- | :--- | :--- |
| **200 OK** | `OK` | Request succeeded |
| **201 Created** | `CREATED` | Resource successfully created |
| **400 Bad Request** | `BAD_REQUEST` | Validation or malformed input error |
| **401 Unauthorized**| `UNAUTHORIZED` | Missing or invalid authentication token |
| **403 Forbidden** | `FORBIDDEN` | Insufficient permissions for resource |
| **404 Not Found** | `NOT_FOUND` | Requested resource does not exist |
| **409 Conflict** | `CONFLICT` | Resource collision (e.g. duplicate email/SKU) |
| **500 Server Error**| `INTERNAL_ERROR`| Unhandled server-side exception |

---

## 4. Complete Endpoints Reference

### 4.1 Health & System Check
| Method | Path | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health check & timestamp | No |

---

### 4.2 Authentication (`/api/v1/auth`)
| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user account | No | Public |
| `POST` | `/api/v1/auth/login` | Authenticate credentials & receive JWT token | No | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & permissions | Yes | All Roles |
| `POST` | `/api/v1/auth/refresh` | Refresh access token using refresh token | Yes | All Roles |
| `POST` | `/api/v1/auth/logout` | Invalidate session cookies / clear auth state | Yes | All Roles |

---

### 4.3 Geocoding & Address Autocomplete (`/api/v1/geocoding`)

Multi-provider backend pipeline combining Google Places / Maps API (Primary) with Nominatim and Photon (Fallbacks), restricted to India (`IN`) with Vadodara search biasing.

| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/geocoding/search` | Autocomplete address search & geocode coordinates | Yes | All Roles |

#### Request Query Parameters:
- `q` (string, required, min length 3): Address search string (e.g. `"Dhyan Residency near Harni Water Tank"`, `"Vadsar Vadodara"`, `"Nilamber Triumph"`).

#### Success Response Example (`GET /api/v1/geocoding/search?q=Dhyan%20Residency%20Harni`):
```json
{
  "success": true,
  "data": {
    "provider": "google",
    "results": [
      {
        "id": "ChIJ...",
        "provider": "google",
        "placeId": "ChIJ...",
        "displayName": "Dhyan Residency, Harni, Vadodara, Gujarat, India",
        "name": "Dhyan Residency",
        "formattedAddress": "Harni, Vadodara, Gujarat, India",
        "city": "Vadodara",
        "state": "Gujarat",
        "pincode": "390022",
        "country": "India",
        "latitude": 22.3312,
        "longitude": 73.2089
      }
    ]
  },
  "message": "Locations fetched successfully"
}
```

---

### 4.4 Customers & Destination Sites (`/api/v1/customers`)

Manages client accounts and facility/destination sites used for field task dispatches and GPS navigation.

| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/customers` | List customer accounts (supports search, pagination) | Yes | All Roles |
| `POST` | `/api/v1/customers` | Create a new customer profile | Yes | Admin, Manager |
| `GET` | `/api/v1/customers/:id` | Get customer details by ID | Yes | All Roles |
| `PUT` | `/api/v1/customers/:id` | Update customer profile | Yes | Admin, Manager |
| `DELETE` | `/api/v1/customers/:id` | Delete customer profile | Yes | Admin |
| `GET` | `/api/v1/customers/:customerId/destinations` | List destination sites for a customer | Yes | All Roles |
| `POST` | `/api/v1/customers/:customerId/destinations` | Register new destination site with GPS & Place ID | Yes | Admin, Manager |
| `GET` | `/api/v1/customers/:customerId/destinations/:destinationId` | Get destination site details | Yes | All Roles |
| `PUT` | `/api/v1/customers/:customerId/destinations/:destinationId` | Update destination site details & coordinates | Yes | Admin, Manager |
| `DELETE` | `/api/v1/customers/:customerId/destinations/:destinationId` | Delete destination site | Yes | Admin |

#### Destination Creation Payload (`POST /api/v1/customers/:customerId/destinations`):
```json
{
  "name": "Dhyan Residency Site",
  "address": "Harni Road, Vadodara, Gujarat",
  "city": "Vadodara",
  "state": "Gujarat",
  "pincode": "390022",
  "latitude": 22.3312,
  "longitude": 73.2089,
  "placeId": "ChIJ...",
  "contactPerson": "Chintan Shah",
  "contactPhone": "+91 98980 12345",
  "notes": "Gate 2 entry requires safety pass",
  "status": "ACTIVE"
}
```

---

### 4.5 Field Workforce Tasks (`/api/v1/tasks`)
| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tasks` | List field tasks with status/engineer filters | Yes | All Roles |
| `POST` | `/api/v1/tasks` | Dispatch new field task assigned to engineer & site | Yes | Admin, Manager |
| `GET` | `/api/v1/tasks/:id` | Fetch task details & assigned GPS destination site | Yes | All Roles |
| `PUT` | `/api/v1/tasks/:id` | Update task details or reassignment | Yes | Admin, Manager |
| `PATCH` | `/api/v1/tasks/:id/status` | Engineer updates task status (In-Transit, Completed) | Yes | Field Engineers |

---

### 4.6 Employee Management (`/api/v1/employees`)
| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/employees` | List field staff & employees | Yes | Admin, Manager |
| `POST` | `/api/v1/employees` | Register new employee profile | Yes | Admin |
| `GET` | `/api/v1/employees/:id` | Get employee profile & task metrics | Yes | All Roles |
| `PUT` | `/api/v1/employees/:id` | Update employee record | Yes | Admin |

---

### 4.7 Attendance & GPS Tracking (`/api/v1/attendance`)
| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/attendance` | List attendance logs & GPS punch records | Yes | Admin, Manager |
| `POST` | `/api/v1/attendance/check-in` | Engineer check-in with live GPS lat/lng | Yes | Field Staff |
| `POST` | `/api/v1/attendance/check-out` | Engineer check-out with total shift distance | Yes | Field Staff |

---

### 4.8 Leads & WhatsApp Integration (`/api/v1/leads`, `/api/v1/whatsapp`)
| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/leads` | List sales leads & CRM pipeline | Yes | Admin, Manager |
| `POST` | `/api/v1/leads` | Create a new lead | Yes | Admin, Manager |
| `POST` | `/api/v1/whatsapp/send-notification` | Trigger automated WhatsApp dispatch notice | Yes | Admin |
