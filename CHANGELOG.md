Some tweaks to make inline parsing more user friendly

# Changelog
### New features
- The charmap now also includes a new ``line_map`` which is similar to the absolute map but then split into their corresponding lines

### Changes
- Color syntax now only parses when their color and text part contains atleast a single character
- code blocks are now only parsed when their last line is no more than ```
- Links are now only parsed when their text or link part contains atleast a single character
- Images are now only parsed when their source contains atleast a single character