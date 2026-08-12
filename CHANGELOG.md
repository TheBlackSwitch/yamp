First actual update kinda.

This fixes many bugs while making multiline parsing with integrated AST a lot easier.

# Changelog
# New features
- new finish() method for the MultilineParser, it will fire once the node can't be extended anymore
- new static parse_ast() method for the MultilineParser which will parse a set of lines into an AST

# Bug fixes
- Block quotes didn't parse propperly when a node with higher priority generated first.
- Block quotes didn't parse propperly when no next line was present