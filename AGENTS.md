# Project architecture decisions

- Tutorial field explanations use transient DOM overlays with viewport-level connectors, because they must point to live form controls without covering the form.
- Relevamiento charts use React Three Fiber procedural scenes, because each saved block needs an interactive 3D visualization without external assets.
- Tutorial responsible-filter demonstrations use a transient event-driven override in the existing filter hook, because they must filter real rows without overwriting the user's selection or opening blocking menus.