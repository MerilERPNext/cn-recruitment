# Code Style Guide for ERPNext and Frappe Project
## User-Facing Messages Must Be Translated
All user-facing strings/text must be wrapped in the __() function in JavaScript and _() function in Python so that they are translated for the user.
## Breaking Functions/Methods Longer Than 10 Lines
Long functions are hard to read and debug. A function should do one thing and only one thing. If a function exceeds 10 lines, break it into smaller parts or consider using a class.
### Signs Your Function is Doing Too Much:

More than one level of indentation (indicates too many logic branches)
Whitespace between logical groups of code (suggests multiple responsibilities)

## Code Indentation

Use tabs, not spaces.
Ensure indentation is consistent in both JavaScript and Python.
Multi-line strings or expressions must be consistently indented.

## SQL Queries
### Preferred SQL Formatting
frappe.db.sql(
    """SELECT
        item_name, description, default_warehouse
    FROM
        tabItem
    WHERE
        disabled = 0"""
)

For query builder (frappe.qb), use Black's formatting:
result = (
    frappe.qb.from_(doctype)
    .select(doctype.name)
    .where(doctype.autoname.like(Concat(prefix, ".%")) &amp; doctype.name != name)
).run()

### SQL Injection Prevention
Do not use .format() for string replacement:
# ❌ WRONG:
frappe.db.sql("SELECT age FROM tabUser WHERE name='{}'".format(user))

# ✅ CORRECT:
frappe.db.sql("SELECT age FROM tabUser WHERE name=%s", user)

## Simple Structures

Avoid complex one-liners with multiple AND or OR conditions.
Break them into multiple lines for readability.

## Function Sequence
The calling function should be at the top, and called functions should be below:
def fa():
    fb()
    fc()

def fb():
    pass

def fc():
    pass

## Business Logic Must Be API-Friendly (Implemented on Server Side)

Any business logic (calculations, value settings) must be implemented server-side (Python) and client-side (JS).
This ensures that when documents are posted via REST API, the logic is executed correctly.

## Commit Messages
Commit messages must follow [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0-beta.2/) standards.
## Code Comments

Code should be self-explanatory, but add comments explaining why a method is implemented in a particular way.
Avoid excessive comments, but document non-trivial logic.

## Avoid Deprecated APIs
Use the latest recommended methods. Avoid:

$c_obj()
cur_frm
get_query
add_fetch

## Tabs, Not Spaces
ERPNext and Frappe projects use tabs, not spaces. No exceptions.
