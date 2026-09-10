# API Documentation & Contract Specification

This document details the REST API specifications, envelope formats, authentication standards, and error schemas.

---

## 1. General API Conventions

- **Base URL**: `http://localhost:5000/api/v1`
- **Content-Type**: `application/json`
- **Authentication Header**: `Authorization: Bearer <JWT_TOKEN>`

---

## 2. Standard API Response Envelope

Every endpoint in the system returns a predictable, standardized envelope.

### Success Response Envelope

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
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
        "field": "price",
        "message": "Price must be greater than 0"
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

## 4. Endpoints Overview

### Health & System
| Method | Path | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health check | No |

### Authentication (`/api/v1/auth`)
| Method | Path | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user | No |
| `POST` | `/api/v1/auth/login` | Log in and receive JWT | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Yes |

### Products Feature (`/api/v1/products`)
| Method | Path | Description | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | List products with filtering & pagination | No | Public |
| `GET` | `/api/v1/products/:id`| Get product details by ID | No | Public |
| `POST` | `/api/v1/products` | Create a new product | Yes | Admin, Manager |
| `PUT` | `/api/v1/products/:id`| Update an existing product | Yes | Admin, Manager |
| `DELETE` | `/api/v1/products/:id`| Delete product | Yes | Admin |
