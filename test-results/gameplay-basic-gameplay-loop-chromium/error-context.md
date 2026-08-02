# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.js >> basic gameplay loop
- Location: tests\e2e\gameplay.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "FLIP 7" [level=1] [ref=e5]
  - textbox "Your Name" [ref=e7]: PlayerOne
  - generic [ref=e8]:
    - generic [ref=e9]:
      - heading "Create a Room" [level=3] [ref=e10]
      - generic [ref=e11]:
        - generic [ref=e12]: Target Score (150)
        - slider [ref=e13] [cursor=pointer]: "150"
      - generic [ref=e14]:
        - generic [ref=e15]: Turn Time (30s)
        - slider [ref=e16] [cursor=pointer]: "30"
      - button "Create Room" [active] [ref=e17] [cursor=pointer]
    - generic [ref=e18]:
      - heading "Join a Room" [level=3] [ref=e19]
      - textbox "Room Code" [ref=e20]
      - button "Join Room" [disabled] [ref=e21] [cursor=pointer]
```