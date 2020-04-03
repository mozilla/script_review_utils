# Script Review Utils

A collection of tools for reviewing javascript scripts found on websites.

This is currently very adhoc, and is starting as a collection of tools
as they are used.

As tools get more used and the use cases emerge, the code can formalize (get
tests, packaged etc.)

For now, the intention is that this repository is cloned and then hacked on
locally to facilitate the analysis needed.

## wet-script

The principle of dry code is to not repeat yourself. And, among other things,
often involves using variables to replace hardcoded values like strings or
constants.

Some javascript code uses this idea to an extreme to obfuscate the code. For 
example:

```js
H = new RegExp(g8z.o8J + v8J + e8J + h8J + z8J + (O8J === (S8J, V9J) ? U8J : g8z.R8J), j8J);
```

In this example, `v8J`, `e8J`, `h8J`, `z8J`, and `j8J` are all strings that can be replaced.
``g8z`` is a reference to an object which has a series of constant properties.
So ``g8z.o8J`` and ``g8z.R8J`` are also strings that can be replaced.
``O8J``, ``S8J``, ``V9J``, and ``U8J`` are all numbers that can be replaced.

Doing these replacements we get:

```js
H = new RegExp("cd" + "n4.for" + "ter.co" + "m.+scr" + "ipt.j" + (36.31 === (256.62, 1851) ? 722.46 : "s"), "gm");
```

We can concatenate all the strings together and get:

```js
H = new RegExp(`cdn4.forter.com.+script.j${36.31 === (256.62, 1851) ? 722.46 : "s"}`, "gm");
```

We can now see that the numbers in the middle are a conditional expression that will always
return false and will return the letter "s". So we can eval the expression and
try again with the string concatenation

```js
H = new RegExp("cdn4.forter.com.+script.js", "gm");
```

As you can see the last line is quite version is readable, the initial version not at
all especially with the variable declarations spread over thousands of lines of code.


The wet-script library contains scripts to manipulate scripts to remove as many variables
as possible and insert their values in the code and tidy up where possible.

