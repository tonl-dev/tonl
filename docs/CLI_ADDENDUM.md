# CLI Additional Commands (v2.0.5)

## Query Command

Execute JSONPath-like queries on TONL or JSON files.

### Syntax

```bash
tonl query <file> <expression> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output file path | stdout |

### Examples

#### Basic Query

```bash
# Get all user names
tonl query users.tonl "users[*].name"

# Output: ["Alice", "Bob", "Charlie"]
```

#### Filter Query

```bash
# Find admin users
tonl query users.tonl "users[?(@.role == 'admin')]"

# Output: [{ "id": 1, "name": "Alice", "role": "admin" }, ...]
```

#### Recursive Query

```bash
# Find all email addresses at any depth
tonl query data.tonl "$..email"
```

#### Complex Filter

```bash
# Find active users over 25 years old
tonl query users.tonl "users[?(@.active && @.age > 25)]"
```

### Query Syntax

- **Property access:** `user.name`, `user.profile.email`
- **Array indexing:** `users[0]`, `users[-1]`
- **Wildcards:** `users[*].name`, `data.*`
- **Recursive descent:** `$..email`
- **Array slicing:** `users[0:5]`, `users[::2]`
- **Filters:** `users[?(@.age > 18)]`

**Filter Operators:**
- Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `&&`, `||`, `!`
- String: `contains`, `startsWith`, `endsWith`, `matches`

---

## Get Command

Retrieve a single value at a specific path (simpler than query).

### Syntax

```bash
tonl get <file> <path> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output file path | stdout |

### Examples

#### Simple Path

```bash
# Get user name
tonl get config.tonl "database.host"

# Output: "localhost"
```

#### Array Index

```bash
# Get first user
tonl get users.tonl "users[0]"

# Output: { "id": 1, "name": "Alice" }
```

#### Negative Index

```bash
# Get last item
tonl get items.tonl "items[-1]"
```

### Get vs Query

- **get**: Fast, single-value retrieval, simple paths only
- **query**: Complex expressions, filters, wildcards, multiple results

---

## Combined Usage Examples

### Configuration Management

```bash
# Get database config
tonl get config.tonl "database"

# Update max connections
tonl set config.tonl "database.maxConnections" 200

# Validate changes
tonl query config.tonl "database"
```

### Data Analysis

```bash
# Count active users
tonl query users.tonl "users[?(@.active)]" | jq length

# Get all admin emails
tonl query users.tonl "users[?(@.role == 'admin')].email"

# Find users by age range
tonl query users.tonl "users[?(@.age >= 18 && @.age <= 65)]"
```

### Pipeline Processing

```bash
# Extract data and pass to next tool
tonl query data.tonl "items[*].price" | jq 'add / length'

# Filter and convert
tonl query users.tonl "users[?(@.active)]" > active-users.json
tonl encode active-users.json --out active-users.tonl
```

---

## REPL Mode (Interactive) - v0.8.0+

Start an interactive REPL session for exploring TONL data.

### Syntax

```bash
tonl [repl] [file]
```

### Examples

```bash
# Start REPL
$ tonl
TONL REPL v2.0.5
Type .help for commands

tonl> .load users.tonl
✓ Loaded: users.tonl (3.2 KB, 45 nodes)

tonl> users[0].name
"Alice"

tonl> users[?(@.age > 25)].name
["Alice", "Charlie"]

tonl> .doc
Document Statistics:
  Size: 3.2 KB
  Nodes: 45
  Max Depth: 4
  Arrays: 3
  Objects: 15

tonl> .exit
```

### REPL Commands

| Command | Description |
|---------|-------------|
| `.load <file>` | Load a TONL or JSON file |
| `.save <file>` | Save current document |
| `.doc` | Show document statistics |
| `.index <name> <field>` | Create an index |
| `.indices` | List all indices |
| `.help` | Show help |
| `.exit` | Exit REPL |

---

**For complete API documentation, see [API.md](./API.md)**
