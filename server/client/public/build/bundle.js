
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const BRUSH_SIZE = 10;
    class Canvas {
        constructor(canvas, cursorPosition, color) {
            this._mousePosition = { x: 0, y: 0 };
            this._pixelObj = { pixelX: 0, pixelY: 0, pixelColor: '' };
            this._canvas = canvas;
            this._mousePositionText = cursorPosition;
            this._context = canvas.getContext("2d");
            this._data = [...Array(canvas.width)].map((value) => Array(canvas.height).fill([255, 255, 255, 255]));
            canvas.addEventListener("click", (event) => {
                color = this._pixelColor;
                this.mouseMovedInCanvas(event);
                this.draw(this._mousePosition.x, this._mousePosition.y, color);
                this._publicMousePosition = { x: this._mousePosition.x, y: this._mousePosition.y };
            });
            canvas.addEventListener('mousemove', (event) => {
                this.mouseMovedInCanvas(event);
                this._mousePositionText.textContent = `x: ${this._mousePosition.x}, y: ${this._mousePosition.y}`;
            });
            this.loadImage();
        }
        // Create the object with position x, y and color.
        savePixel(color) {
            return this._pixelObj = {
                pixelX: this._publicMousePosition.x,
                pixelY: this._publicMousePosition.y,
                pixelColor: color,
            };
        }
        loadImage() {
            const image = new Image();
            image.src = "/images/cat2.png";
            const _this = this;
            image.onload = () => {
                _this._context.canvas.width = image.width;
                _this._context.canvas.height = image.height;
                _this._context.drawImage(image, 0, 0, image.width, image.height);
            };
        }
        draw(x, y, color) {
            this.setColor(color);
            if (x >= 0 && x < this._canvas.width && y >= 0 && y < this._canvas.height) {
                this._context.fillRect(x * BRUSH_SIZE, y * BRUSH_SIZE, BRUSH_SIZE, BRUSH_SIZE);
            }
        }
        setColor(color) {
            // this._context.fillStyle = color    
            this._context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`;
        }
        mouseMovedInCanvas(event) {
            const bounds = this._canvas.getBoundingClientRect();
            let x = event.clientX - bounds.left;
            let y = event.clientY - bounds.top;
            x = Math.floor((this._canvas.width * x) / this._canvas.clientWidth);
            y = Math.floor((this._canvas.height * y) / this._canvas.clientHeight);
            const xPosition = Math.floor(x / BRUSH_SIZE);
            const yPosition = Math.floor(y / BRUSH_SIZE);
            this._mousePosition = { x: xPosition, y: yPosition };
        }
    }

    const SERVER_URL = 'http://localhost:8081';
    class Network {
        serverStatus() {
            const request = new XMLHttpRequest();
            request.open('get', `${SERVER_URL}/status`);
            request.send();
        }
        sendPixel(pixelObj) {
            const request = new XMLHttpRequest();
            request.open('post', `${SERVER_URL}/sendNewPixel`);
            request.setRequestHeader("Content-type", "application/json");
            request.send(JSON.stringify(pixelObj));
        }
    }

    /* src\components\Canvas.svelte generated by Svelte v3.37.0 */

    const { Error: Error_1, console: console_1 } = globals;
    const file$1 = "src\\components\\Canvas.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let div2;
    	let p0;
    	let t1;
    	let p1;
    	let t3;
    	let input;
    	let t4;
    	let div1;
    	let div0;
    	let canvas_1;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Select a color";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "x: 0, y: 0";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div1 = element("div");
    			div0 = element("div");
    			canvas_1 = element("canvas");
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Enviar solicitud para modificar";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Actualizar obra";
    			attr_dev(p0, "class", "svelte-11dun7s");
    			add_location(p0, file$1, 72, 4, 2821);
    			attr_dev(p1, "id", "cursorPosition");
    			attr_dev(p1, "class", "svelte-11dun7s");
    			add_location(p1, file$1, 73, 4, 2848);
    			attr_dev(input, "type", "color");
    			set_style(input, "height", "50px");
    			add_location(input, file$1, 74, 4, 2918);
    			attr_dev(canvas_1, "width", "300px");
    			attr_dev(canvas_1, "height", "300px");
    			attr_dev(canvas_1, "class", "svelte-11dun7s");
    			add_location(canvas_1, file$1, 77, 8, 3046);
    			set_style(div0, "--theme-color", /*color*/ ctx[2]);
    			attr_dev(div0, "class", "svelte-11dun7s");
    			add_location(div0, file$1, 76, 6, 3000);
    			attr_dev(div1, "class", "svelte-11dun7s");
    			add_location(div1, file$1, 75, 4, 2987);
    			attr_dev(button0, "class", "button buttonHover svelte-11dun7s");
    			add_location(button0, file$1, 80, 4, 3136);
    			attr_dev(button1, "class", "button buttonHover svelte-11dun7s");
    			add_location(button1, file$1, 83, 4, 3258);
    			attr_dev(div2, "class", "hero svelte-11dun7s");
    			add_location(div2, file$1, 71, 2, 2797);
    			attr_dev(main, "id", "test");
    			add_location(main, file$1, 70, 0, 2777);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t1);
    			append_dev(div2, p1);
    			/*p1_binding*/ ctx[4](p1);
    			append_dev(div2, t3);
    			append_dev(div2, input);
    			set_input_value(input, /*color*/ ctx[2]);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, canvas_1);
    			/*canvas_1_binding*/ ctx[6](canvas_1);
    			append_dev(div2, t5);
    			append_dev(div2, button0);
    			append_dev(div2, t7);
    			append_dev(div2, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(button0, "click", /*createPixelInfo*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", updatePixelArt, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*color*/ 4) {
    				set_input_value(input, /*color*/ ctx[2]);
    			}

    			if (dirty & /*color*/ 4) {
    				set_style(div0, "--theme-color", /*color*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*p1_binding*/ ctx[4](null);
    			/*canvas_1_binding*/ ctx[6](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function updatePixelArt() {
    	
    }

    //Función para convertir color HEX a rgba
    function hexToRGB(hex) {
    	let rgba = [];
    	var c;

    	if ((/^#([A-Fa-f0-9]{3}){1,2}$/).test(hex)) {
    		c = hex.substring(1).split("");

    		if (c.length == 3) {
    			c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    		}

    		c = "0x" + c.join("");
    		rgba.push(c >> 16 & 255);
    		rgba.push(c >> 8 & 255);
    		rgba.push(c & 255);
    		rgba.push(1);

    		// return "[" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") + ",1]";
    		return rgba;
    	}

    	throw new Error("Bad Hex");
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let canvas;
    	let cursorPosition;
    	let canvasWrapper;
    	let color = "#5c3838";
    	let colorArray = [];
    	let pixels = [];
    	const network = new Network();

    	// onMount(() => {
    	//   network.getPixels();
    	//   canvasWrapper = new Canvas(canvas, cursorPosition, colorArray);
    	// });
    	onMount(() => __awaiter(void 0, void 0, void 0, function* () {
    		canvasWrapper = new Canvas(canvas, cursorPosition, colorArray);
    		const res = yield fetch(`${SERVER_URL}/getStoredPixels`);
    		pixels = yield res.json();
    		console.log(pixels.values);

    		for (let i = 0; i < pixels.values.length; i++) {
    			canvasWrapper.draw(pixels.values[i].pixelX, pixels.values[i].pixelY, [
    				pixels.values[i].r,
    				pixels.values[i].g,
    				pixels.values[i].b,
    				pixels.values[i].a
    			]);
    		}
    	}));

    	//After every update, the color is set by the color from the input
    	afterUpdate(() => {
    		colorArray = hexToRGB(color);
    		canvasWrapper._pixelColor = colorArray;
    	});

    	function createPixelInfo() {
    		if (canvasWrapper) {
    			console.log(canvasWrapper.savePixel(hexToRGB(color)));
    			console.log(hexToRGB(color));
    			console.log(color);
    			network.sendPixel(canvasWrapper.savePixel(hexToRGB(color)));
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	function p1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			cursorPosition = $$value;
    			$$invalidate(1, cursorPosition);
    		});
    	}

    	function input_input_handler() {
    		color = this.value;
    		$$invalidate(2, color);
    	}

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	$$self.$capture_state = () => ({
    		__awaiter,
    		beforeUpdate,
    		onMount,
    		afterUpdate,
    		Canvas,
    		Network,
    		SERVER_URL,
    		canvas,
    		cursorPosition,
    		canvasWrapper,
    		color,
    		colorArray,
    		pixels,
    		network,
    		createPixelInfo,
    		updatePixelArt,
    		hexToRGB
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("canvas" in $$props) $$invalidate(0, canvas = $$props.canvas);
    		if ("cursorPosition" in $$props) $$invalidate(1, cursorPosition = $$props.cursorPosition);
    		if ("canvasWrapper" in $$props) canvasWrapper = $$props.canvasWrapper;
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("colorArray" in $$props) colorArray = $$props.colorArray;
    		if ("pixels" in $$props) pixels = $$props.pixels;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		canvas,
    		cursorPosition,
    		color,
    		createPixelInfo,
    		p1_binding,
    		input_input_handler,
    		canvas_1_binding
    	];
    }

    class Canvas_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas_1",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.37.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let canvas;
    	let current;
    	canvas = new Canvas_1({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Project Pixel";
    			t1 = space();
    			create_component(canvas.$$.fragment);
    			attr_dev(h1, "class", "svelte-sq2aix");
    			add_location(h1, file, 4, 2, 101);
    			attr_dev(main, "id", "test");
    			add_location(main, file, 3, 0, 81);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(canvas, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(canvas);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Canvas: Canvas_1 });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
