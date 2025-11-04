// Additional JSON examples for playground
const additionalExamples = {
    simpleArray: `[1, 2, 3, 4, 5, "hello", true, false, null]`,

    basicNested: `{
  "user": {
    "name": "John Doe",
    "contact": {
      "email": "john@example.com",
      "phone": "+1-555-0100"
    }
  }
}`,

    employees: `{
  "employees": [
    {"id": 101, "name": "Sarah Connor", "dept": "Engineering", "salary": 95000, "manager": null},
    {"id": 102, "name": "Kyle Reese", "dept": "Engineering", "salary": 85000, "manager": 101},
    {"id": 103, "name": "John Connor", "dept": "Product", "salary": 110000, "manager": null},
    {"id": 104, "name": "Miles Dyson", "dept": "Research", "salary": 125000, "manager": null}
  ]
}`,

    customers: `{
  "customers": [
    {
      "customerId": "CUST-001",
      "name": "Acme Corporation",
      "industry": "Manufacturing",
      "since": "2020-01-15",
      "tier": "Enterprise",
      "monthlySpend": 15000,
      "contacts": [
        {"name": "Jane Smith", "role": "CTO", "email": "jane@acme.com"},
        {"name": "Bob Wilson", "role": "Procurement", "email": "bob@acme.com"}
      ]
    },
    {
      "customerId": "CUST-002",
      "name": "TechStart Inc",
      "industry": "Technology",
      "since": "2023-06-20",
      "tier": "Startup",
      "monthlySpend": 2500,
      "contacts": [
        {"name": "Alice Chen", "role": "CEO", "email": "alice@techstart.io"}
      ]
    }
  ]
}`,

    invoices: `{
  "invoices": [
    {
      "invoiceId": "INV-2025-001",
      "customerId": "CUST-001",
      "date": "2025-01-15",
      "dueDate": "2025-02-15",
      "status": "paid",
      "items": [
        {"description": "Professional Services", "hours": 40, "rate": 150, "amount": 6000},
        {"description": "Cloud Hosting", "quantity": 1, "rate": 500, "amount": 500}
      ],
      "subtotal": 6500,
      "tax": 520,
      "total": 7020
    }
  ]
}`,

    orders: `{
  "orders": [
    {
      "orderId": "ORD-789012",
      "customer": "Alice Johnson",
      "orderDate": "2025-11-01T10:30:00Z",
      "status": "shipped",
      "shippingAddress": {
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94105"
      },
      "items": [
        {"sku": "PROD-001", "name": "Laptop", "quantity": 1, "price": 1299.99},
        {"sku": "PROD-045", "name": "Mouse", "quantity": 2, "price": 29.99}
      ],
      "total": 1359.97
    }
  ]
}`,

    inventory: `{
  "warehouse": "WH-SF-01",
  "lastUpdated": "2025-11-04T12:00:00Z",
  "inventory": [
    {
      "sku": "PROD-001",
      "name": "Professional Laptop",
      "category": "Electronics",
      "quantity": 45,
      "reorderLevel": 20,
      "supplier": "TechSupply Inc",
      "location": "Aisle A, Shelf 3",
      "unitCost": 850.00,
      "retailPrice": 1299.99
    },
    {
      "sku": "PROD-002",
      "name": "Wireless Mouse",
      "category": "Accessories",
      "quantity": 150,
      "reorderLevel": 50,
      "supplier": "PeripheralsCo",
      "location": "Aisle B, Shelf 1",
      "unitCost": 15.00,
      "retailPrice": 29.99
    }
  ]
}`,

    cart: `{
  "cartId": "cart_abc123",
  "userId": "user_456",
  "createdAt": "2025-11-04T10:00:00Z",
  "items": [
    {
      "productId": "prod_789",
      "name": "Mechanical Keyboard",
      "quantity": 1,
      "price": 89.99,
      "addedAt": "2025-11-04T10:05:00Z"
    },
    {
      "productId": "prod_101",
      "name": "USB-C Cable",
      "quantity": 3,
      "price": 12.99,
      "addedAt": "2025-11-04T10:12:00Z"
    }
  ],
  "subtotal": 128.96,
  "shipping": 9.99,
  "tax": 11.11,
  "total": 150.06,
  "appliedCoupons": ["SAVE10"]
}`,

    reviews: `{
  "productId": "prod_laptop_001",
  "averageRating": 4.6,
  "totalReviews": 234,
  "reviews": [
    {
      "reviewId": "rev_001",
      "userId": "user_789",
      "username": "TechLover92",
      "rating": 5,
      "title": "Excellent laptop for professionals",
      "content": "This laptop exceeded my expectations. Battery life is amazing and performance is top-notch.",
      "verified": true,
      "helpful": 45,
      "notHelpful": 2,
      "date": "2025-10-15"
    },
    {
      "reviewId": "rev_002",
      "userId": "user_456",
      "username": "DevGuru",
      "rating": 4,
      "title": "Great but a bit pricey",
      "content": "Love the build quality and screen. Wish it was slightly cheaper.",
      "verified": true,
      "helpful": 23,
      "notHelpful": 5,
      "date": "2025-10-20"
    }
  ]
}`,

    webhooks: `{
  "webhooks": [
    {
      "id": "wh_abc123",
      "url": "https://api.example.com/webhooks/payment",
      "events": ["payment.succeeded", "payment.failed", "refund.created"],
      "active": true,
      "secret": "whsec_xyz789",
      "createdAt": "2025-01-15T00:00:00Z",
      "lastTriggered": "2025-11-04T09:30:00Z",
      "successCount": 1247,
      "failureCount": 3
    }
  ]
}`,

    github: `{
  "event": "pull_request",
  "action": "opened",
  "pull_request": {
    "id": 123456789,
    "number": 42,
    "state": "open",
    "title": "Add new feature: User authentication",
    "user": {
      "login": "developer123",
      "id": 987654,
      "type": "User"
    },
    "body": "This PR adds JWT-based authentication with refresh tokens.",
    "created_at": "2025-11-04T10:00:00Z",
    "updated_at": "2025-11-04T10:00:00Z",
    "head": {
      "ref": "feature/auth",
      "sha": "abc123def456"
    },
    "base": {
      "ref": "main",
      "sha": "def456abc123"
    },
    "labels": ["enhancement", "security"],
    "requested_reviewers": [
      {"login": "reviewer1", "id": 111222}
    ]
  },
  "repository": {
    "id": 445566,
    "name": "awesome-project",
    "full_name": "company/awesome-project",
    "private": false
  }
}`,

    metrics: `{
  "service": "api-gateway",
  "timestamp": "2025-11-04T12:00:00Z",
  "period": "1h",
  "metrics": {
    "requests": {
      "total": 125430,
      "success": 124987,
      "errors": 443,
      "errorRate": 0.35
    },
    "latency": {
      "p50": 45,
      "p95": 120,
      "p99": 280,
      "max": 1250
    },
    "throughput": {
      "requestsPerSecond": 34.84,
      "mbPerSecond": 12.5
    },
    "endpoints": [
      {
        "path": "/api/v1/users",
        "requests": 45230,
        "avgLatency": 42,
        "errorRate": 0.12
      },
      {
        "path": "/api/v1/products",
        "requests": 38450,
        "avgLatency": 38,
        "errorRate": 0.08
      }
    ]
  }
}`,

    surveys: `{
  "surveyId": "survey_customer_satisfaction_2025",
  "title": "Customer Satisfaction Survey Q4 2025",
  "responses": 1247,
  "completionRate": 78.5,
  "results": [
    {
      "questionId": "q1",
      "question": "How satisfied are you with our product?",
      "type": "rating",
      "responses": {
        "5_stars": 687,
        "4_stars": 412,
        "3_stars": 98,
        "2_stars": 35,
        "1_star": 15
      },
      "average": 4.48
    },
    {
      "questionId": "q2",
      "question": "Would you recommend us to a friend?",
      "type": "boolean",
      "responses": {
        "yes": 1089,
        "no": 158
      },
      "percentage": 87.3
    },
    {
      "questionId": "q3",
      "question": "What could we improve?",
      "type": "multipleChoice",
      "responses": {
        "pricing": 345,
        "features": 567,
        "support": 123,
        "documentation": 212
      }
    }
  ]
}`,

    blog: `{
  "posts": [
    {
      "id": "post_001",
      "title": "Getting Started with TONL",
      "slug": "getting-started-tonl",
      "author": {
        "id": "author_123",
        "name": "Alex Smith",
        "bio": "Developer Advocate"
      },
      "publishedAt": "2025-10-15T10:00:00Z",
      "tags": ["tutorial", "getting-started", "tonl"],
      "excerpt": "Learn how to use TONL for token-optimized data serialization",
      "content": "In this comprehensive guide, we'll explore...",
      "readTime": 8,
      "views": 15234,
      "likes": 892,
      "comments": 45
    }
  ]
}`,

    comments: `{
  "postId": "post_001",
  "totalComments": 45,
  "comments": [
    {
      "id": "cmt_001",
      "author": "user_456",
      "authorName": "DevGuru",
      "content": "Great article! This helped me reduce my LLM costs by 40%.",
      "createdAt": "2025-10-16T08:30:00Z",
      "likes": 23,
      "replies": [
        {
          "id": "cmt_002",
          "author": "user_789",
          "authorName": "CodeMaster",
          "content": "Same here! TONL is amazing.",
          "createdAt": "2025-10-16T09:15:00Z",
          "likes": 12
        }
      ]
    }
  ]
}`,

    notifications: `{
  "userId": "user_123",
  "unreadCount": 5,
  "notifications": [
    {
      "id": "notif_001",
      "type": "mention",
      "title": "New mention in Project Alpha",
      "message": "@john mentioned you in a comment",
      "link": "/projects/alpha/tasks/42",
      "read": false,
      "timestamp": "2025-11-04T10:30:00Z",
      "priority": "high"
    },
    {
      "id": "notif_002",
      "type": "assignment",
      "title": "New task assigned",
      "message": "You've been assigned 'Implement user authentication'",
      "link": "/tasks/156",
      "read": false,
      "timestamp": "2025-11-04T09:15:00Z",
      "priority": "medium"
    },
    {
      "id": "notif_003",
      "type": "system",
      "title": "System maintenance scheduled",
      "message": "Scheduled maintenance on Nov 10, 2025 at 2:00 AM UTC",
      "link": "/maintenance",
      "read": true,
      "timestamp": "2025-11-03T12:00:00Z",
      "priority": "low"
    }
  ]
}`,

    mixed: `{
  "string": "Hello TONL",
  "number": 42,
  "float": 3.14159,
  "boolean": true,
  "null": null,
  "array": [1, "two", 3.0, false, null],
  "nested": {
    "deep": {
      "deeper": {
        "value": "deeply nested"
      }
    }
  },
  "mixed_array": [
    {"type": "object", "value": 1},
    "string",
    42,
    [1, 2, 3],
    {"nested": {"value": "complex"}}
  ]
}`
};
