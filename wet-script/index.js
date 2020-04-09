const babel = require('@babel/core')
const fs = require('fs')
const t = require('@babel/types')
const templateLiterals = require('./template-literals.js')
const argv = require('minimist')(process.argv.slice(2), {alias: {f: 'file'}})

let codeFile = argv['file']
let codeIn = fs.readFileSync(codeFile, {encoding: 'utf-8'})

// Let's build our magic special objects.
// This is entirely specific to forter script, could this
// be automated / librarified?
let globalObjs = {
  'W1MM': {},
  'b1MM': {},
  'A1MM': {}
}
const getGlobals = babel.transformSync(codeIn, {
  plugins: [
    function buildSpecialObjects() {
      return {
        visitor: {
          AssignmentExpression(path) {
            if ((path.node.left.type == 'MemberExpression') && (path.node.left.object.name in globalObjs)) {
              globalObjs[path.node.left.object.name][path.node.left.property.name] = path.node.right
              path.remove()
            }
          }
        }
      }
    }
  ]
})

// Function to take a literal value as input, along with a reference, and 
// return a new literal node output. e.g. if the value of a node
// was a stringLiteral, this would return a new stringLiteral node 
// that we can then sub in instead.
const getNewNode = (literal, reference) => {
  let newNode;
  if (t.isStringLiteral(literal)) {
    newNode = t.stringLiteral(literal.value)
  } else if (t.isNumericLiteral(literal)) {
    if (reference && t.isUpdateExpression(reference.parent)) {
      // Handle the fact that we don't want to replace in this case
      // c5 && a5[g5] ? ++0 : t5 += " unsupported"
      newNode = null
    } else {
      newNode = t.numericLiteral(literal.value)
    }
  } else if (t.isNullLiteral(literal)) {
    newNode = t.nullLiteral()
  } else if (t.isBooleanLiteral(literal)) {
    newNode = t.booleanLiteral(literal.value)
  } else {
    // leave it alone
    newNode = null
  }
  return newNode
}

const replaceVars = babel.transformSync(getGlobals.code, {
  plugins: [
    function replaceVars() {
      return {
        visitor: {
          VariableDeclarator(path) {
            if (path.node.init) {
              if (t.isIdentifier(path.node.init)) {
                //console.log(path.node.loc.start)
                //console.log(path.node.id.name)
                //console.log(path.node.init.name)
                //console.log(path)
                //console.log(path.node.loc.start.line, path.node.id.name, 'is a ref to', path.node.init.name)
                // Get refs to object identifier
                if ( path.node.id.name in path.scope.bindings ) {
                  let refsInScope = path.scope.bindings[path.node.id.name].referencePaths
                  refsInScope.forEach((n) => {
                    if (path.node.init.name in globalObjs) {
                      newLiteral = globalObjs[path.node.init.name][n.parent.property.name]
                      const newNode = getNewNode(newLiteral, n)
                      if (newNode !== null) {
                        n.parentPath.replaceWith(newNode)
                      }
                    }
                  })
                }
              } else if ( t.isArrayExpression(path.node.init) ){
                // No handling for arrays right now
              } else if ( t.isBinaryExpression(path.node.init) ){
                // No handling for ^^ right now
              } else if ( t.isFunctionExpression(path.node.init) ){
                // No handling for ^^ right now
              } else if ( t.isUnaryExpression(path.node.init) ){
                // No handling for ^^ right now
              } else if ( t.isConditionalExpression(path.node.init) ){
                // No handling for ^^ right now
              } else if ( t.isLogicalExpression(path.node.init) ){
                // No handling for ^^ right now
              } else if ( t.isObjectExpression(path.node.init) ) {
                // No handling for ^^ right now - i think this is fine generally actually - if objects
                // are being built up, leaving this will be clearer
              } else if ( t.isCallExpression(path.node.init) ) {
                // No handling for ^^ right now
                // One example is var U2 = document.createElement("canvas");
                // could be good to make that clearer later
              } else if ( t.isMemberExpression(path.node.init) ){
                if ( path.node.id.name in path.scope.bindings ) {
                  let refsInScope = path.scope.bindings[path.node.id.name].referencePaths
                  refsInScope.forEach((n) => {
                    n.replaceWith(
                      t.memberExpression(path.node.init.object, path.node.init.property)
                    )
                  });
                }
              } else {
                //console.log(path.node.loc.start)
                //console.log(path.node)
                //console.log(path.node.loc.start.line, path.node.id.name, path.node.init.value)
                if ( path.node.id.name in path.scope.bindings ) {
                  let refsInScope = path.scope.bindings[path.node.id.name].referencePaths
                  refsInScope.forEach((n) => {
                    const newNode = getNewNode(path.node.init, n)
                    if (newNode !== null) {
                      n.replaceWith(newNode)
                    }
                  });
                }
              }
            }
          },
          MemberExpression(path) {
            if (path.node.object.name in globalObjs) {
              newLiteral = globalObjs[path.node.object.name][path.node.property.name]
              const newNode = getNewNode(newLiteral, null)
              if (newNode !== null) {
                path.replaceWith(newNode)
              }
            }
          }
        }
      }
    }
  ]
})

const cleanOutVars = babel.transformSync(replaceVars.code, {
  plugins: [
    function cleanOutVars() {
      return {
        visitor: {
          VariableDeclarator(path) {
            // just takes care of the easy ones - this is enough to dramatically shorten code
            if ( path.node.id.name in path.scope.bindings ) {
              if (path.parentPath.node.declarations.length === 1 ) {
                if (path.scope.bindings[path.node.id.name].references === 0) {
                  path.parentPath.remove()
                }
              }
            }
          },
        }
      }
    }
  ]
});

const evaled = babel.transformSync(cleanOutVars.code, {
  plugins: [
    function evalConditionals() {
      return {
        visitor: {
          ConditionalExpression(path) {
            // handle things like this (695.57 == 670.61 ? 428.35 : "h")
            try {
              const result = eval(String(path))
              if ( typeof(result) === "string" ) {
                path.replaceWith(t.stringLiteral(result))
              }
            } catch {
              // No problem if this fails
            }
          },
        }
      }
    }
  ]
});

// Note: The output from babel transforms, you need to read the object.code
// But the output from templateLiterals, which is a jscodeshift codemod
// is just the code itself.

const concatStrings = templateLiterals(evaled.code, {})
//console.log(concatStrings)
fs.writeFileSync(codeFile, concatStrings)
console.info('Success. File written to', codeFile)
