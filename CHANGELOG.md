Ok finally found the time to address these things 

(Yup my types are still not working. please let me know what I'm doing wrong T-T)

# Bugs fixed
- The add zero width space characters option caused the charmap for inline syntax to be offset.
- The charmap inside table cells didn't align whatsoever.
- Charmap caching chached to much if an extended line's parent got re-parsed.
- Cache data didn't get cleared propperly when removing big chunks of text. This resulted in some text breefly appearing
