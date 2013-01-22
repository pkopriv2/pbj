var pbj = {
	version: '0.1'
};

// = Function: $typeof
//
// Returns the type of an object, as specified by the return of the Object's
// toString method.
//
// Params:
//	  {Object} obj - the object whose type is being seeked.
//
// Return:
//	  {String} - the type of the object. Can be one of the following:
//		    1. "Undefined"
//		    2. "Null"
//		    3. "Object"
//		    4. "Array"
//		    5. "Function"
//		    6. "Boolean"
//		    7. "Number"
//		    8. "Collection"
//		    9. "Location"
//		    10. "Document"
//		    11. "Window"
//		    12. "Arguments"
//		    ... MANY MORE ...
//
var $typeof = function(obj) {
	if(obj === undefined) return "Undefined";
	if(obj === null)	return "Null";
	if(obj.getElementById || obj.all) return "Document";
	if(obj.item) return "Collection";
	if(obj.callee) return "Arguments";
	if(obj.nodeType) return "Element";


	var regexp = /^\[object ([a-zA-Z]+)\]$/
	var type = Object.prototype.toString.apply(obj);

	return type.replace(regexp, "$1");
};

// = Function: $xargs
//
// A utility function that eases calling other functions.
//
// Params:
//	  {Function} fn
//		- The function with which to invoke.
//	  {Object} params
//		- The optional params to pass to the the xargs function.
//
// Return:
//	  {Object} - returns the value returned by the function.
//
var $xargs = function(fn) {
	if($typeof(fn) != "Function") throw "Invalid use of $xargs.  First argument must be a Function."

	var args = [], cur, type;
	for(var i=1; i<arguments.length; ) {
		cur = arguments[i];

		type = $typeof(cur)
		if(type == "Arguments" || type == "Collection") {
			args = args.concat(Array.prototype.slice.apply(cur));
			i += cur.length;
			continue;
		}

		args[i++ - 1] = cur;
	}

	return fn.apply(window, args)
};


// = Function: $each
//
// Can iterate any iterable object.
//
// Params:
//	  {Object} obj -
//		    the object being iterated.
//	  {Function} fn -
//		    the callback function to be called for each item in obj.
//	  {Object} {Optional} bind -
//		    the object for which to bind the context of the callback.
//
// Return:
//	  {void} - return
//
var $each = function(obj, fn, local, bind) {
	var cur;
	switch($typeof(obj)) {
		case 'Collection' :
		case 'Arguments':
		case 'Array':
			for(var i=0; i<obj.length; i++) {
				if(obj.item) cur = obj.item(i)
					else cur = obj[i]

				if(fn.call(bind || obj, cur, i) === false) {
					return;
				}
			}
			break;
		case 'Function':
		case 'Object':
			for(var key in obj) {
				if(local && !obj.hasOwnProperty(key)) continue;
				cur = obj[key]
				if(fn.call(bind || obj, cur, key) === false) {
					return;
				}
			}
			break;
		default:
			throw "Invalid use of $each.	Object must be iterable."

	}
};


// = Function: $extend
//
// Extends one object by a key value pair or another object..
//
// Params:
//	  {Object} obj -
//		    the oject to be extended.
//	  {String} key -
//		    the key for which to add a property.
//	  {Object} val -
//		    the value to add to the object.
//
// Return:
//	  {void} - return
//
var $extend = function(obj, key, val) {
	// Handle: $extend(obj, {})
	if(arguments.length == 2) {
		$each(key, function(v, k) {
			if(!key.hasOwnProperty(k)) return;
			$extend(obj, k, v);
		});

		return;
	}

	// Handle: simple copy
	obj[key] = val;
};

// = Function: $merge
//
// Deep merge of one object's properties with another.
//
// Params:
//	  {Object} orig -
//		    the target/recipient of the merge.
//	  {Object} obj -
//		    the object whose properties will be merged. If this object has
//		    conflicting properties with the original, then it is this object
//		    whose properties take precedence.
// Return:
//	  {Object} - the merged object.
///
var $merge = function(orig, obj) {
	// Handle: invalid inputs.
	if(!orig || !obj) {
		return null;
	}

	// Handle: invalid merge.
	if( !(orig instanceof Object) || !(obj instanceof Object)) throw "Invalid use of $merge().  Both parameters must be objects!";


	for(var key in obj) {
		if(!obj.hasOwnProperty(key)) continue;

		// Handle: merge another level.
		if(orig[key] instanceof Object && obj[key] instanceof Object) {
			orig[key] = $merge(orig[key], obj[key]);
			continue;
		}

		orig[key] = obj[key];
	}

	return orig;
};


// = Function: $delimit
//
//  Allows the caller to set or retrieve deep values in an object simply
//  by calling $delimit({}, "x.y.z", 1), regardless of whether x, y or z
//  even exist.
//
// Params:
//	  {Object} obj -
//		    The object that is being delimitted.
//	  {String} path -
//		    The path to the relevant subobject.
//	  {Object} val -
//		    the value to set (if not set, then implied return)
//	  {Boolean} merge -
//		    if val is an object, do you want to merge, or overwrite?
//
// Return:
//	  {Object} - the value at the specified path.
//
var $delimit = function(obj, path, val, merge) {
	if(path == undefined) {
		return null;
	}

	// need to split the option name into between it's levels.
	var arr = path.split("."), lvl = obj;
	for(var i=0; i<arr.length-1; i++) {
		if(val !== undefined) {
			lvl[arr[i]] = lvl[arr[i]] !== undefined ? lvl[arr[i]] : {};
		}

		lvl = lvl[arr[i]] || {};
	}

	// Handle: return the value
	if(val == undefined) {
		return lvl[arr[arr.length-1]];
	}

	// Handle: set the value (or merge if applicable)
	if(merge && ($typeof(lvl[arr[arr.length-1]]) ==  "Object")	&& ($typeof(val) == "Object")) {
		return lvl[arr[arr.length-1]] = $merge(lvl[arr[arr.length-1]], val)
	} else {
		return lvl[arr[arr.length-1]] = val;
	}
};


// = Function: $clone
//
// Copies and returns an object.
//
// Params:
//	  param
//
// Return:
//	  {void} - return
//
var $clone = function(obj) {
	// Determines whether an object is a simple browser provided object or not.
	var isPrimitive = function(obj) {
		return obj.constructor == Date	|| 
		obj.constructor == RegExp	|| 
		obj.constructor == String	||
		obj.constructor == Function 	||
		obj.constructor == Number	||
		obj.constructor == Boolean;
	}

	// Determines whether this object is a simple object (ie one we are able to clone)
	var isSimple = function(obj) {
		var type = $typeof(obj)

		return type == "Object" || type == "Array" || isPrimitive(obj);
	}

	// Clones an object. Assumes a primitive.
	var simpleClone = function(obj) {
		if(obj.constructor == Function) return obj;
		return new obj.constructor(obj).valueOf()
	}

	// Handle: primitive copy
	if(isPrimitive(obj)) return simpleClone(obj);

	// Grab the type (we will need it)
	var type = $typeof(obj)
	if(type !== "Object" && type !== "Array") throw "Can only clone simple user-made objects.";

	// Initialize the return value
	var ret = type == "Object" ? {} : []

	// Okay, begin the *real* clone
	var queue1 = [], queue2 = []; // queue1 will contain the children, queue2 the parents.
	$each(obj, function(root, key) {
		// store a reference to the current node.
		var curRoot = root;

		// Handle: invalid clone.
		if(!isSimple(curRoot)) throw "Can only clone objects composed of simple objects.";

		// will need a running count of the direct chidlren of this tree.
		var numChildren = 0;

		// put the children into the child queue.
		var primitive = isPrimitive(curRoot);
		if(!primitive) {
			$each(curRoot, function(child, key) {
				queue1.push({ node: child, index: key });
				numChildren += 1;
			});
		}

		// put the parent in.
		var rootCopy = primitive ? simpleClone(curRoot) : $typeof(curRoot) == "Object" ? {} : [];

		// store a reference to the rootCopy in the parents' queue.
		queue2.push({ node: rootCopy , numChildren: numChildren });

		// put the rootCopy in the return structure.
		ret[key] = rootCopy;


		// Okay, let's start copying the current subtree.
		var parent = null;
		while(parent = queue2.shift()) {
			var count = parent.numChildren;
			var node = parent.node;

			while(count > 0) {
				// grab the current child element
				var child = queue1.shift();

				// detect an invalid clone.
				if(!isSimple(child.node)) throw "Can only clone simple objects!";

				// add the child to the parent.
				var childPrimitive = isPrimitive(child.node);

				// now, put the grandchildren in the children queue.
				var numGChildren = 0;
				if(!childPrimitive) {
					$each(child.node, function(cur, key) {
						queue1.push({ node: cur, index: key });
						numGChildren += 1;
					});
				}

				// make a shallow copy
				var childCopy = childPrimitive ? simpleClone(child.node) : $typeof(child.node) == "Object" ? {} : [];

				// the child has become a parent itself.
				queue2.push({ node: childCopy, numChildren: numGChildren });

				// bind the copy to the parent at the appropriate branch location.
				node[child.index] = childCopy;

				// we're done with this child 
				count -= 1;
			}
		}
	});

	// finally return it!
	return ret;
};

$extend(Function.prototype, {
	define: function() {
		if(arguments.length > 0) $xargs($extend, this.prototype, arguments);
		return this;
	},
	undefine: function(key) {
		if(this.prototype.hasOwnProperty(key)) delete this.prototype[key]; // TODO: TEST THIS!
		return this;
	},
	isDefined: function(key) {
		return key in this.prototype;
	},
	$static: function() {
		if(arguments.length > 0) $xargs($extend, this, arguments);
		return this;
	},
	unstatic: function(key) {
		if(this.hasOwnProperty(key)) delete this[key]; // TODO: TEST THIS!
		return this;
	},
	isStatic: function(key) {
		return key in this;
	}
});

(function(window, undefined) {
	// = Function: Interface
	//
	// Provides a utility for creating class contracts.
	//
	// Params:
	//	  {Object} def - the definition of the interface.
	//
	// Return:
	//	  {Object} - the interface itself.
	//
	window.Interface = function(def) {
		var statics = def.Static || {};
		var methods = def.Methods || [];

		if($typeof(methods) !== "Array") throw "Methods in an interface must be an array!";

		var self = this;
		$each(methods, function(cur, i) {
			if($typeof(cur) !== "String") return;
			self[i] = cur;
		});

		$each(statics, function(val, key) {
			self[key] = val;
		});
	};


	// = Function: Class
	//
	// Provides a very useful utility function for quickly creating classes.
	//
	// Params:
	//	  {Object} def -
	//
	// Return:
	//	  {Function} - The constructor function to create the class.
	//
	window.Class = function(def) {
		if($typeof(def) !== "Object") throw "Classes may only be defined by an object literal.";

		// Grab the constructor, if it exists.
		var constructor = def.constructor || function() {};

		// Check the constructor type.
		if($typeof(constructor) !== "Function") throw "Constructor must be a function";

		// Implement the class specific functionality.
		Includes(constructor, def.Includes || []);
		Implements(constructor, def.Implements || []);
		Statics(constructor, def.Statics || {});

		// Remove the special keys.
		delete def.Includes
		delete def.Implements
		delete def.Statics

		// Implement the other methods.
		$each(def, function(val, key) {
			constructor.define(key, val);
		});

		// Finally, return the new class.
		return constructor;
	}

	// Provides mixins	
	var Includes = function(constructor, others) {
		if($typeof(others) !== "Array") others = [others];

		$each(others, function(cur) {
			constructor.define(cur.prototype);
		});
	};

	// Implements interfaces.
	var Implements = function(constructor, others) {
		if($typeof(others) !== "Array") others = [others];

		var methods = []
		$each(others, function(intf) {
			if(!(intf instanceof Interface)) throw "Can only implement interfaces.";

			$each(intf, function(cur){
				methods.push(cur);
			});
		});

		$each(methods, function(method){
			if(!constructor.isDefined(method)) throw "Class does not implement method: " + method;
		});
	};

	// Provides static definitions.
	var Statics = function(constructor, others) {
		if($typeof(obj) !== "Object") throw "A static block must be an Object!";
		constructor.$static(obj);
	};
})(window);


// = Script: Namespace.js
//
// Author: Preston Koprivica <pkopriv2@gmail.com>
//
// Description:
//	- Provides a set of utility functions for manipulating a global namespace.
//
// Requires:
//	- Utility.js
///
(function(window, undefined) {
	// store a reference to the namespaces object. 	
	var namespaces = pbj.namespaces || {}


	// = Class:  Context
	//
	// Defines the basic structure and capabilities of a namespace context.
	// Essentially allows callers to be able to bind objects and functions to
	// itself.
	//
	// Constructor Params:
	//	{String} space -
	//		The namespae that is automatically merged with the context.
	//
	function Context(space) {
		var self = this;

		this.$import = function(space) {
			var imported = $delimit(namespaces, space);

			// Handle: space references nothing
			if(imported == null) {
				return;
			}

			// Handle: import entire namespace (or object)
			if($typeof(imported) == "Object") {
				$merge(self, imported);
				return;
			}

			// Handle: bind the value
			var path = space.split('.');
			self[path[path.length-1]] = imported;
		}

		this.$import(space || '');
	}

	// = Function: $context
	//
	// Builds an execution context that may only import other namespaces,
	// but cannot edit any.
	//
	//
	// Params:
	//	{Function} fn - The namespace closure.
	//
	// Return:
	//	{Void}
	//
	window.$context = function(fn) {
		// bind the prototype
		fn.prototype = new Context();

		// process the context.
		new fn(window);
	}


	// = Function: $namespace
	//
	// Builds a customized execution context that automatically imports the
	// given namespace. Any "live" attributes (those delimited by "this"
	// keyword) of the provided constructor function will be merged into the
	// namespace, as well.
	//
	// Params:
	//	{String} space -
	//		The namespace that namespace closure aims to edit.
	//	{Function} fn -
	//		The namespace closure.
	//
	// Return:
	//	  {void} - return
	//
	window.$namespace = function(space, fn) {
		var context;

		// start building the namespace prototype
		fn.prototype = new Context(space);

		// build the context
		context = new fn(window);

		// update the global namespace with ONLY the instance variables
		for(var key in context) {
			if(!context.hasOwnProperty(key)) continue;
			$delimit(namespaces, space + "." + key, context[key])
		}
	}
})(window, undefined);
