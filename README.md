# Isaac floor generator

A floor generator for The Binding of Isaac: Repentance. It builds floors using the same rules as the game and draws them with the game's minimap sprites.

You can:
- generate a floor for any stage from Basement I to Womb II
- change the seed, keys, coins, health, curses (including XL floors) and other run settings and see how the floor changes
- replay how a floor was built, one step at a time

## Running it

Open `index.html` in a browser. There is nothing to install or build.

To run the tests (needs Node.js):

```
node test.js
```

This generates 5000 floors and checks that they are valid.

## How accurate is it

The layout rules, dead ends, boss choice, planetarium and secret rooms follow the game's own logic. Special room order and odds come from [bladecoding's special_rooms.lua](https://gist.github.com/bladecoding/d75aef7e830c738ad5e3d66d146a095c). Boss pools and room layouts come from the game files (`bosspools.xml`, `rooms/00.special rooms.stb`).

What's different:
- seeds don't match the game's seeds
- it assumes everything is unlocked, you have no items and all doors are open

## Files

- `index.html`, `site.css`, `tokens.css`, `base.css` - the page
- `js/gen.js` - the generator (no DOM, also used by the tests)
- `js/app.js` - drawing, controls and the replay
- `js/lettering.js` - draws text with the game's TeamMeat font
- `assets/`, `icon/` - sprites taken from the game

## Credits

Fan project. The Binding of Isaac and all its art belong to Edmund McMillen and Nicalis.
