
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function loader (urls, test, callback) {
      let remaining = urls.length;

      function maybeCallback () {
        remaining = --remaining;
        if (remaining < 1) {
          callback();
        }
      }

      if (!test()) {
        urls.forEach(({ type, url, options = { async: true, defer: true }}) => {
          const isScript = type === 'script';
          const tag = document.createElement(isScript ? 'script': 'link');
          if (isScript) {
            tag.src = url;
            tag.async = options.async;
            tag.defer = options.defer;
          } else {
            tag.rel = 'stylesheet';
    		    tag.href = url;
          }
          tag.onload = maybeCallback;
          document.body.appendChild(tag);
        });
      } else {
        callback();
      }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const mapsLoaded = writable(false);
    const mapsLoading = writable(false);

    /* node_modules\@anoram\leaflet-svelte\src\LoadSdk.svelte generated by Svelte v3.24.0 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
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
    	let $mapsLoaded;
    	let $mapsLoading;
    	validate_store(mapsLoaded, "mapsLoaded");
    	component_subscribe($$self, mapsLoaded, $$value => $$invalidate(2, $mapsLoaded = $$value));
    	validate_store(mapsLoading, "mapsLoading");
    	component_subscribe($$self, mapsLoading, $$value => $$invalidate(3, $mapsLoading = $$value));
    	const dispatch = createEventDispatcher();
    	let L = {};
    	let map = "";

    	onMount(() => {
    		if ($mapsLoaded) {
    			dispatch("ready");
    		}

    		if (!$mapsLoading) {
    			mapsLoading.set(true);

    			loader(
    				[
    					{
    						type: "style",
    						url: `https://unpkg.com/leaflet@1.7.1/dist/leaflet.css`
    					},
    					{
    						type: "script",
    						url: `https://unpkg.com/leaflet@1.7.1/dist/leaflet.js`
    					}
    				],
    				() => {
    					return false;
    				},
    				() => {
    					L = window.L;
    					map = L.map;
    					mapsLoaded.set(true);
    					return true;
    				}
    			);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<LoadSdk> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("LoadSdk", $$slots, []);

    	$$self.$capture_state = () => ({
    		loader,
    		createEventDispatcher,
    		onMount,
    		mapsLoaded,
    		mapsLoading,
    		dispatch,
    		L,
    		map,
    		$mapsLoaded,
    		$mapsLoading
    	});

    	$$self.$inject_state = $$props => {
    		if ("L" in $$props) L = $$props.L;
    		if ("map" in $$props) map = $$props.map;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$mapsLoaded*/ 4) {
    			 $mapsLoaded && dispatch("ready");
    		}
    	};

    	return [];
    }

    class LoadSdk extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LoadSdk",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* node_modules\@anoram\leaflet-svelte\src\Leaflet.svelte generated by Svelte v3.24.0 */

    const { window: window_1 } = globals;
    const file = "node_modules\\@anoram\\leaflet-svelte\\src\\Leaflet.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let t;
    	let loadsdk;
    	let current;
    	let mounted;
    	let dispose;
    	loadsdk = new LoadSdk({ $$inline: true });
    	loadsdk.$on("ready", /*initialise*/ ctx[1]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = space();
    			create_component(loadsdk.$$.fragment);
    			attr_dev(div, "class", "map svelte-1xdqv5q");
    			attr_dev(div, "id", /*mapID*/ ctx[0]);
    			add_location(div, file, 219, 0, 4925);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			/*div_binding*/ ctx[7](div);
    			insert_dev(target, t, anchor);
    			mount_component(loadsdk, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window_1, "resize", /*resizeMap*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*mapID*/ 1) {
    				attr_dev(div, "id", /*mapID*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loadsdk.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loadsdk.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[7](null);
    			if (detaching) detach_dev(t);
    			destroy_component(loadsdk, detaching);
    			mounted = false;
    			dispose();
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

    function instance$1($$self, $$props, $$invalidate) {
    	let L = {};
    	let map = "";
    	const dispatch = createEventDispatcher();
    	let { options } = $$props;

    	let { zoom = 13, maxZoom = 19, minZoom = 1, mapID = "map", attributionControl = true, center = [0, 0], markers, circles, recenter = false, scrollWheelZoom = true, tilelayers = [
    		{
    			url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    			attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    		}
    	], controls = {
    		zoomControl: true,
    		position: "topleft",
    		scale: false
    	} } = options;

    	let icon;
    	let markersArray = [];
    	let circleArray = [];
    	let bounds;

    	let defaultIcon = {
    		iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    		iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    		shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    		iconSize: [25, 41],
    		iconAnchor: [12, 41],
    		popupAnchor: [1, -34],
    		tooltipAnchor: [1, -34],
    		shadowSize: [41, 41]
    	};

    	function initialise() {
    		setTimeout(
    			() => {
    				L = window["L"];
    				createMap();
    				dispatch("ready");
    			},
    			1
    		);
    	}

    	function makePopup(marker, options) {
    		marker.bindPopup(options.text, {
    			closeOnClick: false,
    			autoClose: false,
    			...options
    		}).addTo(map);

    		if (options.isOpen) {
    			marker.openPopup();
    		}
    	}

    	function makeTooltip(marker, options) {
    		marker.bindTooltip(options.text, { ...options }).addTo(map);

    		if (options.isOpen) {
    			marker.openTooltip();
    		}
    	}

    	let m = [];

    	const addMarker = obj => {
    		// console.log(obj);
    		obj.markers.map((e, i) => {
    			if (e.icon) {
    				// console.log(e.icon)
    				icon = L.icon(e.icon);
    			}

    			m[i] = new L.marker([e.lat, e.lng], { icon }).addTo(map);

    			if (e.popup) {
    				makePopup(m[i], e.popup);
    			}

    			if (e.tooltip) {
    				makeTooltip(m[i], e.tooltip);
    			}
    		});
    	};

    	let added = false;

    	const updateMarkers = obj => {
    		if (!added) {
    			addMarker(obj);
    			added = true;
    		}

    		obj.markers.map((i, k) => {
    			// console.log(i);
    			m[k].setLatLng(i).update();

    			m[k].addTo(map);
    		});
    	}; // map.panTo(arr[0])
    	// console.log(m);

    	const setZoom = (x = 5) => {
    		map.setZoom(x);
    	};

    	function createMap() {
    		map = L.map(mapID, {
    			attributionControl,
    			zoomControl: controls.zoomControl,
    			minZoom,
    			maxZoom
    		}).setView(center, zoom);

    		m = L.marker([0, 0]);

    		if (tilelayers) {
    			tilelayers.map(e => {
    				L.tileLayer(e.url, { ...e }).addTo(map);
    			});
    		}

    		if (!scrollWheelZoom) {
    			map.scrollWheelZoom.disable();
    		}

    		let controlElement = L.control;

    		if (!controls.zoomControl) {
    			controlElement().remove();
    		}

    		if (controls.scale) {
    			controlElement.scale({ position: controls.position }).addTo(map);
    		}

    		if (controls.zoomControl && controls.position) {
    			map.removeControl(map.zoomControl);
    			controlElement.zoom({ position: controls.position }).addTo(map);
    		}

    		if (markers) {
    			markers.map(e => {
    				markersArray.push([e.lat, e.lng]);

    				if (e.icon) {
    					icon = L.icon(e.icon);
    				} else {
    					icon = L.icon(defaultIcon);
    				}

    				let marker = new L.marker([e.lat, e.lng], { icon });

    				if (e.popup) {
    					makePopup(marker, e.popup);
    				}

    				if (e.tooltip) {
    					makeTooltip(marker, e.tooltip);
    				}

    				marker.addTo(map);
    			});
    		}

    		if (circles) {
    			circles.map(e => {
    				circleArray.push([e.lat, e.lng]);
    				let circle = new L.circle([e.lat, e.lng], { ...e });

    				if (e.popup) {
    					makePopup(circle, e.popup);
    				}

    				if (e.tooltip) {
    					makeTooltip(circle, e.tooltip);
    				}

    				circle.addTo(map);
    			});
    		}

    		if (recenter) {
    			if (markersArray.length == 1) {
    				map.panTo(L.latLng(markersArray[0][0], markersArray[0][1]));
    				map.setZoom(zoom);
    			} else {
    				bounds = new L.LatLngBounds(markersArray);
    				map.fitBounds(bounds);
    			}
    		}
    	}

    	function resizeMap() {
    		if (map) {
    			map.invalidateSize();
    		}
    	}

    	const writable_props = ["options"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Leaflet> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Leaflet", $$slots, []);

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			mapID = $$value;
    			$$invalidate(0, mapID);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("options" in $$props) $$invalidate(3, options = $$props.options);
    	};

    	$$self.$capture_state = () => ({
    		LoadSdk,
    		createEventDispatcher,
    		L,
    		map,
    		dispatch,
    		options,
    		zoom,
    		maxZoom,
    		minZoom,
    		mapID,
    		attributionControl,
    		center,
    		markers,
    		circles,
    		recenter,
    		scrollWheelZoom,
    		tilelayers,
    		controls,
    		icon,
    		markersArray,
    		circleArray,
    		bounds,
    		defaultIcon,
    		initialise,
    		makePopup,
    		makeTooltip,
    		m,
    		addMarker,
    		added,
    		updateMarkers,
    		setZoom,
    		createMap,
    		resizeMap
    	});

    	$$self.$inject_state = $$props => {
    		if ("L" in $$props) L = $$props.L;
    		if ("map" in $$props) map = $$props.map;
    		if ("options" in $$props) $$invalidate(3, options = $$props.options);
    		if ("zoom" in $$props) zoom = $$props.zoom;
    		if ("maxZoom" in $$props) maxZoom = $$props.maxZoom;
    		if ("minZoom" in $$props) minZoom = $$props.minZoom;
    		if ("mapID" in $$props) $$invalidate(0, mapID = $$props.mapID);
    		if ("attributionControl" in $$props) attributionControl = $$props.attributionControl;
    		if ("center" in $$props) center = $$props.center;
    		if ("markers" in $$props) markers = $$props.markers;
    		if ("circles" in $$props) circles = $$props.circles;
    		if ("recenter" in $$props) recenter = $$props.recenter;
    		if ("scrollWheelZoom" in $$props) scrollWheelZoom = $$props.scrollWheelZoom;
    		if ("tilelayers" in $$props) tilelayers = $$props.tilelayers;
    		if ("controls" in $$props) controls = $$props.controls;
    		if ("icon" in $$props) icon = $$props.icon;
    		if ("markersArray" in $$props) markersArray = $$props.markersArray;
    		if ("circleArray" in $$props) circleArray = $$props.circleArray;
    		if ("bounds" in $$props) bounds = $$props.bounds;
    		if ("defaultIcon" in $$props) defaultIcon = $$props.defaultIcon;
    		if ("m" in $$props) m = $$props.m;
    		if ("added" in $$props) added = $$props.added;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		mapID,
    		initialise,
    		resizeMap,
    		options,
    		addMarker,
    		updateMarkers,
    		setZoom,
    		div_binding
    	];
    }

    class Leaflet extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				options: 3,
    				addMarker: 4,
    				updateMarkers: 5,
    				setZoom: 6
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Leaflet",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*options*/ ctx[3] === undefined && !("options" in props)) {
    			console.warn("<Leaflet> was created without expected prop 'options'");
    		}
    	}

    	get options() {
    		throw new Error("<Leaflet>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Leaflet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addMarker() {
    		return this.$$.ctx[4];
    	}

    	set addMarker(value) {
    		throw new Error("<Leaflet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get updateMarkers() {
    		return this.$$.ctx[5];
    	}

    	set updateMarkers(value) {
    		throw new Error("<Leaflet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setZoom() {
    		return this.$$.ctx[6];
    	}

    	set setZoom(value) {
    		throw new Error("<Leaflet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file$1 = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (100:2) {#each ISSPass as item}
    function create_each_block(ctx) {
    	let li;
    	let t0_value = new Date(/*item*/ ctx[12].risetime * 1000).toLocaleString() + "";
    	let t0;
    	let t1;
    	let br;
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			add_location(br, file$1, 102, 4, 2438);
    			attr_dev(li, "class", "pass");
    			add_location(li, file$1, 100, 3, 2360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, br);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ISSPass*/ 16 && t0_value !== (t0_value = new Date(/*item*/ ctx[12].risetime * 1000).toLocaleString() + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(100:2) {#each ISSPass as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let map;
    	let t0;
    	let main;
    	let p0;
    	let t1;
    	let t2_value = (/*lat*/ ctx[0] ?? "loading") + "";
    	let t2;
    	let t3;
    	let t4_value = (/*lng*/ ctx[1] ?? "loading") + "";
    	let t4;
    	let t5;
    	let t6;
    	let p1;
    	let t7;
    	let t8;
    	let ul;
    	let t9;
    	let h3;
    	let t10;
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let t11;
    	let footer;
    	let span;
    	let t13;
    	let a;
    	let current;
    	let map_props = { options: /*options*/ ctx[5] };
    	map = new Leaflet({ props: map_props, $$inline: true });
    	/*map_binding*/ ctx[7](map);
    	map.$on("ready", /*init*/ ctx[6]);
    	let each_value = /*ISSPass*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(map.$$.fragment);
    			t0 = space();
    			main = element("main");
    			p0 = element("p");
    			t1 = text("Current location:\r\n\t\t");
    			t2 = text(t2_value);
    			t3 = text(",\r\n\t\t");
    			t4 = text(t4_value);
    			t5 = text("\r\n\t\t(updates 15s once)");
    			t6 = space();
    			p1 = element("p");
    			t7 = text(/*warntext*/ ctx[3]);
    			t8 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			h3 = element("h3");
    			t10 = text("ISS 🛰️ tracker with\r\n\t\t");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			t11 = space();
    			footer = element("footer");
    			span = element("span");
    			span.textContent = "from";
    			t13 = space();
    			a = element("a");
    			a.textContent = "Anoram";
    			attr_dev(div, "class", "map svelte-7snk8j");
    			add_location(div, file$1, 87, 0, 2077);
    			attr_dev(p0, "class", "latlon");
    			add_location(p0, file$1, 91, 1, 2188);
    			add_location(p1, file$1, 97, 1, 2304);
    			add_location(ul, file$1, 98, 1, 2324);
    			attr_dev(path0, "id", "logotype");
    			attr_dev(path0, "fill", "#4a4a55");
    			attr_dev(path0, "d", "M172.39,100.41a24.1,24.1,0,0,1-13.72-3.87,19.86,19.86,0,0,1-8-10.61L159,82.86a15.4,15.4,0,0,0,5.45,6.6,14.37,14.37,0,0,0,8.27,2.43,12.14,12.14,0,0,0,7.88-2.38,8.29,8.29,0,0,0,2.94-6.82,7.43,7.43,0,0,0-.81-3.45,10.32,10.32,0,0,0-1.83-2.6,12.36,12.36,0,0,0-3.16-2.09c-1.42-.71-2.59-1.25-3.53-1.62s-2.32-.87-4.13-1.49c-2.28-.8-4-1.42-5.12-1.88a37.86,37.86,0,0,1-4.47-2.25,16.37,16.37,0,0,1-4.18-3.16A15.43,15.43,0,0,1,153.81,60a14.77,14.77,0,0,1,4-16.79q5.12-4.51,13.89-4.51,7.34,0,12.06,3.23a15.63,15.63,0,0,1,6.35,8.61l-8.18,2.73a9.57,9.57,0,0,0-4-4.39A13.3,13.3,0,0,0,171,47.24a10.7,10.7,0,0,0-6.69,1.87,6.28,6.28,0,0,0-2.42,5.29,5.52,5.52,0,0,0,1.87,4.09,13,13,0,0,0,3.92,2.64c1.36.57,3.44,1.33,6.22,2.3,1.7.63,3,1.09,3.79,1.41s2,.83,3.62,1.57a25.79,25.79,0,0,1,3.67,2,34.36,34.36,0,0,1,3,2.43,12.86,12.86,0,0,1,2.6,3.11,17.06,17.06,0,0,1,1.53,3.84,17.42,17.42,0,0,1,.64,4.81q0,8.36-5.71,13.08T172.39,100.41Zm54.62-1L206.56,39.74h9.54l13.55,41.58a66.19,66.19,0,0,1,1.88,6.82,63.43,63.43,0,0,1,1.87-6.82l13.38-41.58h9.46L235.87,99.39Zm47.29,0V39.74h37v8.35H283.17V64.45h18.15V72.8H283.17V91h30v8.35Zm61.44,0V39.74h8.87V90.87h29.14v8.52Zm71.41-51.13V99.39h-8.86V48.26H381.42V39.74H424v8.52Zm35.2,51.13V39.74h37v8.35H451.21V64.45h18.15V72.8H451.21V91h30v8.35Z");
    			add_location(path0, file$1, 114, 3, 2644);
    			attr_dev(path1, "id", "back");
    			attr_dev(path1, "fill", "#ff3e00");
    			attr_dev(path1, "d", "M110.23,28.39C99.83,13.51,79.29,9.1,64.44,18.56L38.36,35.18a29.9,29.9,0,0,0-13.52,20,31.53,31.53,0,0,0,3.1,20.24,29.94,29.94,0,0,0-4.47,11.18,31.86,31.86,0,0,0,5.45,24.12c10.4,14.88,30.94,19.29,45.79,9.83L100.79,104a30,30,0,0,0,13.52-20,31.52,31.52,0,0,0-3.11-20.23,30.13,30.13,0,0,0,4.48-11.18,31.9,31.9,0,0,0-5.45-24.12");
    			add_location(path1, file$1, 118, 3, 3963);
    			attr_dev(path2, "id", "front");
    			attr_dev(path2, "fill", "#fff");
    			attr_dev(path2, "d", "M61.89,112.16a20.73,20.73,0,0,1-22.24-8.25,19.14,19.14,0,0,1-3.27-14.5A17,17,0,0,1,37,87l.49-1.5,1.34,1A33.78,33.78,0,0,0,49,91.56l1,.29-.09,1A5.9,5.9,0,0,0,51,96.7a6.25,6.25,0,0,0,6.7,2.48,5.85,5.85,0,0,0,1.6-.7L85.34,81.86a5.42,5.42,0,0,0,2.45-3.64,5.77,5.77,0,0,0-1-4.37,6.25,6.25,0,0,0-6.7-2.48,5.72,5.72,0,0,0-1.6.7l-10,6.35a19.1,19.1,0,0,1-5.29,2.32A20.72,20.72,0,0,1,41,72.5,19.16,19.16,0,0,1,37.75,58a18,18,0,0,1,8.13-12.06L72,29.32A19.05,19.05,0,0,1,77.26,27a20.71,20.71,0,0,1,22.23,8.25,19.14,19.14,0,0,1,3.28,14.5,20.15,20.15,0,0,1-.62,2.43l-.5,1.5-1.33-1a33.78,33.78,0,0,0-10.2-5.1l-1-.29.09-1a5.86,5.86,0,0,0-1.06-3.88A6.23,6.23,0,0,0,81.49,40a5.72,5.72,0,0,0-1.6.7L53.8,57.29a5.45,5.45,0,0,0-2.45,3.63,5.84,5.84,0,0,0,1,4.38A6.25,6.25,0,0,0,59,67.78a6,6,0,0,0,1.6-.7l10-6.34a18.61,18.61,0,0,1,5.3-2.33,20.7,20.7,0,0,1,22.23,8.24,19.16,19.16,0,0,1,3.28,14.5,18,18,0,0,1-8.13,12.06L67.19,109.83a19.18,19.18,0,0,1-5.3,2.33");
    			add_location(path2, file$1, 122, 3, 4342);
    			attr_dev(svg, "id", "svelte");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "300");
    			attr_dev(svg, "height", "80");
    			attr_dev(svg, "viewBox", "0 0 519 139");
    			add_location(svg, file$1, 108, 2, 2521);
    			attr_dev(h3, "class", "sign");
    			add_location(h3, file$1, 106, 1, 2476);
    			attr_dev(main, "class", "text-center");
    			add_location(main, file$1, 90, 0, 2159);
    			add_location(span, file$1, 130, 1, 5386);
    			attr_dev(a, "href", "https://anoram.com");
    			add_location(a, file$1, 131, 1, 5406);
    			attr_dev(footer, "class", "text-center");
    			add_location(footer, file$1, 129, 0, 5355);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(map, div, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, p0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(main, t6);
    			append_dev(main, p1);
    			append_dev(p1, t7);
    			append_dev(main, t8);
    			append_dev(main, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(main, t9);
    			append_dev(main, h3);
    			append_dev(h3, t10);
    			append_dev(h3, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, span);
    			append_dev(footer, t13);
    			append_dev(footer, a);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const map_changes = {};
    			map.$set(map_changes);
    			if ((!current || dirty & /*lat*/ 1) && t2_value !== (t2_value = (/*lat*/ ctx[0] ?? "loading") + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*lng*/ 2) && t4_value !== (t4_value = (/*lng*/ ctx[1] ?? "loading") + "")) set_data_dev(t4, t4_value);
    			if (!current || dirty & /*warntext*/ 8) set_data_dev(t7, /*warntext*/ ctx[3]);

    			if (dirty & /*Date, ISSPass*/ 16) {
    				each_value = /*ISSPass*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(map.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(map.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*map_binding*/ ctx[7](null);
    			destroy_component(map);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const CORS = "https://cors.anoram.workers.dev/?";
    const URL = "http://api.open-notify.org/iss-now.json";
    const passes = "http://api.open-notify.org/iss-pass.json?alt=20&n=5&";

    function instance$2($$self, $$props, $$invalidate) {
    	let lat, lng;

    	let options = {
    		zoom: 2,
    		center: [0, 0],
    		mapID: "map",
    		tilelayers: [
    			{
    				url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    				attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
    				subdomains: "abcd",
    				maxZoom: 19
    			}
    		]
    	};

    	async function getISS() {
    		let data = await fetch(`${CORS}${URL}`);
    		let res = await data.json();
    		$$invalidate(0, lat = res.iss_position.latitude);
    		$$invalidate(1, lng = res.iss_position.longitude);
    		return { lat, lng };
    	}

    	let MAP_EL;

    	async function init() {
    		(async function fn() {
    			let latlng = await getISS();

    			let marker = {
    				lat: latlng.lat,
    				lng: latlng.lng,
    				icon: {
    					iconUrl: "./favicon.png",
    					iconSize: [48, 48]
    				}
    			};

    			MAP_EL.updateMarkers({ markers: [marker] });
    			setTimeout(fn, 5000);
    		})();
    	}

    	let warntext = "Please allow location access to know when ISS will pass your location.";

    	function getLocation() {
    		if (navigator.geolocation) {
    			navigator.geolocation.getCurrentPosition(showPosition);
    		} else {
    			console.warn("Geolocation is not supported by this browser / Not shared");
    		}
    	}

    	function showPosition(position) {
    		fetchPasses(position.coords.latitude, position.coords.longitude);
    	}

    	getLocation();
    	let ISSPass = "";

    	async function fetchPasses(lt, ln) {
    		$$invalidate(3, warntext = "loading...");

    		const res = await fetch(`${CORS}${passes}lat=${lt}&lon=${ln}`).then(async data => {
    			let d = await data.json();
    			$$invalidate(4, ISSPass = await d.response);
    			$$invalidate(3, warntext = "Check below for the passes!");
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function map_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			MAP_EL = $$value;
    			$$invalidate(2, MAP_EL);
    		});
    	}

    	$$self.$capture_state = () => ({
    		Map: Leaflet,
    		CORS,
    		URL,
    		passes,
    		lat,
    		lng,
    		options,
    		getISS,
    		MAP_EL,
    		init,
    		warntext,
    		getLocation,
    		showPosition,
    		ISSPass,
    		fetchPasses
    	});

    	$$self.$inject_state = $$props => {
    		if ("lat" in $$props) $$invalidate(0, lat = $$props.lat);
    		if ("lng" in $$props) $$invalidate(1, lng = $$props.lng);
    		if ("options" in $$props) $$invalidate(5, options = $$props.options);
    		if ("MAP_EL" in $$props) $$invalidate(2, MAP_EL = $$props.MAP_EL);
    		if ("warntext" in $$props) $$invalidate(3, warntext = $$props.warntext);
    		if ("ISSPass" in $$props) $$invalidate(4, ISSPass = $$props.ISSPass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [lat, lng, MAP_EL, warntext, ISSPass, options, init, map_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,

    });
    console.log('%c with love from anoram ', 'font-weight: bold; font-size: 15px;color: #fc4a1a;  border:1px dotted #f7b733');

    return app;

}());
