# wet-script

## Pre-requisites

Requires [nodejs](https://nodejs.org/en/) to be installed. I do this using
[conda](https://docs.conda.io/en/latest/miniconda.html):


    $ conda create -n wet-script nodejs -c conda-forge
    $ conda activate wet-script


## Install


    $ npm install


## Use


### Top level usage

    $ npm run pipeline --infile=path_to_orig_script.js --outfile=where_to_put_output.js


### Hacking

There are two stages to the script:

1. Use babel to essentially pretty-print the script
    1. `npx babel in_script.js -o out_script.js`
1. Use babel and jscodeshift to manipulate the code over multiple steps.
    1. `node index.js --file out_script.js`

The second stage is all in index.js and is where the magic happens. The current version
is highly tailored to the script I was working on. In particular the code early on that
builds three global objects.

Suggested hacking would be to run step 1 and then hack on index.js creating multiple
temp files and logging across the different steps till you achieve desired results.


## References

References that helped while getting up to speed with babel, and ASTs:
* [Babel listed vidoes](https://babeljs.io/videos) In particular:
    * https://www.youtube.com/watch?v=2W9tUnALrLg
    * https://www.youtube.com/watch?v=UeVq_U5obnE
    * https://www.youtube.com/watch?v=HPJSoIRYeG4
* [Babel docs](https://babeljs.io/docs/en/). In particular:
    * https://babeljs.io/docs/en/babel-types
* [Babel handbook](https://github.com/jamiebuilds/babel-handbook/)
* [Really great blogpost by Tan Li Hau](https://lihautan.com/step-by-step-guide-for-writing-a-babel-transformation/)
* [AST Explorer](https://astexplorer.net/):
    * I used babylon7 as parser. Note that for large files I found that it 
      would crash / hang browser for certain parsers (in particular recast when
      I was trying to work with jscodeshift).
* Codemods (I ended up finding it easier to not write codemods): 
    * https://github.com/cpojer/js-codemod/
    * https://vramana.github.io/blog/2015/12/21/codemod-tutorial/


## Motivation

he principle of dry code is to not repeat yourself. And, among other things,
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

## Contributing

If you find a new class of code obfuscation, that can be handled with another layer of processing
please open an issue.

Contributions to modularize / librarify / generalize this would be welcome.
This would need to start with adding testing functionality that captures the behavior
already working in this script.
