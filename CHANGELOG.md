Yay got many things fixed! (Yup my types are still not working. please let me know what I'm doing wrong T-T)

# New features
- Inline syntax can now span across multiple lines in a single paragraph
- Html syntax can now span across multiple lines in a single paragraph and will remove any leading newline after it's tags

# Bugs fixed
- Cached nodes didn't call the finish() method on multiline parsers
- Certain multilines didn't parse when there was an empty line after them
- Code would also parse when there where more than 2 backticks
- Code blocks dissapeared sometimes when the ending backticks contained an extra character