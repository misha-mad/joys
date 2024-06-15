(function(document, window) {
    var juxtapose = {
        sliders: [],
        OPTIMIZATION_ACCEPTED: 1,
        OPTIMIZATION_WAS_CONSTRAINED: 2
    };

    function Graphic(properties, slider) {
        var self = this;
        this.image = new Image();

        this.loaded = false;
        this.image.onload = function() {
            self.loaded = true;
            slider._onLoaded();
        };

        this.image.src = properties.src;
        this.image.alt = properties.alt || '';
        this.label = properties.label || false;
        this.credit = properties.credit || false;
    }

    function FlickrGraphic(properties, slider) {
        var self = this;
        this.image = new Image();

        this.loaded = false;
        this.image.onload = function() {
            self.loaded = true;
            slider._onLoaded();
        };

        this.flickrID = this.getFlickrID(properties.src);
        this.callFlickrAPI(this.flickrID, self);

        this.label = properties.label || false;
        this.credit = properties.credit || false;
    }

    function getNaturalDimensions(DOMelement) {
        if (DOMelement.naturalWidth && DOMelement.naturalHeight) {
            return { width: DOMelement.naturalWidth, height: DOMelement.naturalHeight };
        }
        var img = new Image();
        img.src = DOMelement.src;
        return { width: img.width, height: img.height };
    }

    function getImageDimensions(img) {
        return {
            width: getNaturalDimensions(img).width,
            height: getNaturalDimensions(img).height,
            aspect: function () {
                return (this.width / this.height);
            }
        };
    }

    function addClass(element, c) {
        if (element.classList) {
            element.classList.add(c);
        } else {
            element.className += " " + c;
        }
    }

    function removeClass(element, c) {
        element.className = element.className.replace(/(\S+)\s*/g, function(w, match) {
            if (match === c) {
                return '';
            }
            return w;
        }).replace(/^\s+/, '');
    }

    function setText(element, text) {
        if (document.body.textContent) {
            element.textContent = text;
        } else {
            element.innerText = text;
        }
    }

    function getComputedWidthAndHeight(element) {
        if (window.getComputedStyle) {
            return {
                width: parseInt(getComputedStyle(element).width, 10),
                height: parseInt(getComputedStyle(element).height, 10)
            };
        } else {
            w = element.getBoundingClientRect().right - element.getBoundingClientRect().left;
            h = element.getBoundingClientRect().bottom - element.getBoundingClientRect().top;
            return {
                width: parseInt(w, 10) || 0,
                height: parseInt(h, 10) || 0
            };
        }
    }

    function getPageX(e) {
        var pageX;
        if (e.pageX) {
            pageX = e.pageX;
        } else if (e.touches) {
            pageX = e.touches[0].pageX;
        } else {
            pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        }
        return pageX;
    }

    function getPageY(e) {
        var pageY;
        if (e.pageY) {
            pageY = e.pageY;
        } else if (e.touches) {
            pageY = e.touches[0].pageY;
        } else {
            pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        return pageY;
    }

    function checkFlickr(url) {
        if (url.match(/flic.kr\/.+/i)) {
            return true;
        }
        var idx = url.indexOf("flickr.com/photos/");
        return idx !== -1;
    }

    function getLeftPercent(slider, input) {
        if (typeof(input) === "string" || typeof(input) === "number") {
            leftPercent = parseInt(input, 10);
        } else {
            var sliderRect = slider.getBoundingClientRect();
            var offset = {
                top: sliderRect.top + document.body.scrollTop + document.documentElement.scrollTop,
                left: sliderRect.left + document.body.scrollLeft + document.documentElement.scrollLeft
            };
            var width = slider.offsetWidth;
            var pageX = getPageX(input);
            var relativeX = pageX - offset.left;
            leftPercent = (relativeX / width) * 100;
        }
        return leftPercent;
    }

    function getTopPercent(slider, input) {
        if (typeof(input) === "string" || typeof(input) === "number") {
            topPercent = parseInt(input, 10);
        } else {
            var sliderRect = slider.getBoundingClientRect();
            var offset = {
                top: sliderRect.top + document.body.scrollTop + document.documentElement.scrollTop,
                left: sliderRect.left + document.body.scrollLeft + document.documentElement.scrollLeft
            };
            var width = slider.offsetHeight;
            var pageY = getPageY(input);
            var relativeY = pageY - offset.top;
            topPercent = (relativeY / width) * 100;
        }
        return topPercent;
    }

    var BOOLEAN_OPTIONS = { 'animate': true, 'showLabels': true, 'showCredits': true, 'makeResponsive': true };

    function interpret_boolean(x) {
        if (typeof(x) != 'string') {
            return Boolean(x);
        }
        return !(x === 'false' || x === '');
    }

    function JXSlider(selector, images, options) {
        this.selector = selector;
        var i;
        this.options = {
            animate: true,
            showLabels: true,
            showCredits: true,
            makeResponsive: true,
            startingPosition: "50%",
            mode: 'horizontal',
            callback: null
        };

        for (i in this.options) {
            if (i in options) {
                if (i in BOOLEAN_OPTIONS) {
                    this.options[i] = interpret_boolean(options[i]);
                } else {
                    this.options[i] = options[i];
                }
            }
        }

        if (images.length === 2) {

            if (checkFlickr(images[0].src)) {
                this.imgBefore = new FlickrGraphic(images[0], this);
            } else {
                this.imgBefore = new Graphic(images[0], this);
            }

            if (checkFlickr(images[1].src)) {
                this.imgAfter = new FlickrGraphic(images[1], this);
            } else {
                this.imgAfter = new Graphic(images[1], this);
            }

        } else {
            console.warn("The images parameter takes two Image objects.");
        }

        this.options.showCredits = !!(this.imgBefore.credit || this.imgAfter.credit);
    }

    JXSlider.prototype = {
        updateSlider: function(input, animate) {
            var leftPercent, rightPercent;

            if (this.options.mode === "vertical") {
                leftPercent = getTopPercent(this.slider, input);
            } else {
                leftPercent = getLeftPercent(this.slider, input);
            }

            leftPercent = leftPercent.toFixed(2) + "%";
            leftPercentNum = parseFloat(leftPercent);
            rightPercent = (100 - leftPercentNum) + "%";

            if (leftPercentNum > 0 && leftPercentNum < 100) {
                removeClass(this.handle, 'transition');
                removeClass(this.rightImage, 'transition');
                removeClass(this.leftImage, 'transition');

                if (this.options.animate && animate) {
                    addClass(this.handle, 'transition');
                    addClass(this.leftImage, 'transition');
                    addClass(this.rightImage, 'transition');
                }

                if (this.options.mode === "vertical") {
                    this.handle.style.top = leftPercent;
                    this.leftImage.style.height = leftPercent;
                    this.rightImage.style.height = rightPercent;
                } else {
                    this.handle.style.left = leftPercent;
                    this.leftImage.style.width = leftPercent;
                    this.rightImage.style.width = rightPercent;
                }
                this.sliderPosition = leftPercent;
            }
        },

        displayLabel: function(element, labelText) {
            label = document.createElement("div");
            label.className = 'jx-label';
            label.setAttribute('tabindex', 0); //put the controller in the natural tab order of the document

            setText(label, labelText);
            element.appendChild(label);
        },

        displayCredits: function() {
            credit = document.createElement("div");
            credit.className = "jx-credit";

            text = "<em>Photo Credits:</em>";
            if (this.imgBefore.credit) { text += " <em>Before</em> " + this.imgBefore.credit; }
            if (this.imgAfter.credit) { text += " <em>After</em> " + this.imgAfter.credit; }

            credit.innerHTML = text;

            this.wrapper.appendChild(credit);
        },

        checkImages: function() {
            return getImageDimensions(this.imgBefore.image).aspect() ===
                getImageDimensions(this.imgAfter.image).aspect();
        },

        calculateDims: function(width, height) {
            var ratio = getImageDimensions(this.imgBefore.image).aspect();
            if (width) {
                height = width / ratio;
            } else if (height) {
                width = height * ratio;
            }
            return {
                width: width,
                height: height,
                ratio: ratio
            };
        },

        responsivizeIframe: function(dims) {
            //Check the slider dimensions against the iframe (window) dimensions
            if (dims.height < window.innerHeight) {
                //If the aspect ratio is greater than 1, imgs are landscape, so letterbox top and bottom
                if (dims.ratio >= 1) {
                    this.wrapper.style.paddingTop = parseInt((window.innerHeight - dims.height) / 2) + "px";
                }
            } else if (dims.height > window.innerHeight) {
                /* If the image is too tall for the window, which happens at 100% width on large screens,
                 * force dimension recalculation based on height instead of width */
                dims = this.calculateDims(0, window.innerHeight);
                this.wrapper.style.paddingLeft = parseInt((window.innerWidth - dims.width) / 2) + "px";
            }
            if (this.options.showCredits) {
                // accommodate the credits box within the iframe
                dims.height -= 13;
            }
            return dims;
        },

        setWrapperDimensions: function() {
            var wrapperWidth = getComputedWidthAndHeight(this.wrapper).width;
            var wrapperHeight = getComputedWidthAndHeight(this.wrapper).height;
            var dims = this.calculateDims(wrapperWidth, wrapperHeight);
            if (window.location !== window.parent.location && !this.options.makeResponsive) {
                dims = this.responsivizeIframe(dims);
            }

            this.wrapper.style.height = parseInt(dims.height) + "px";
            this.wrapper.style.width = parseInt(dims.width) + "px";
        },

        _onLoaded: function() {

            if (this.imgBefore && this.imgBefore.loaded === true &&
                this.imgAfter && this.imgAfter.loaded === true) {

                this.wrapper = document.querySelector(this.selector);
                addClass(this.wrapper, 'juxtapose');

                this.wrapper.style.width = getNaturalDimensions(this.imgBefore.image).width;
                this.setWrapperDimensions();

                this.slider = document.createElement("div");
                this.slider.className = 'jx-slider';
                this.wrapper.appendChild(this.slider);

                if (this.options.mode !== "horizontal") {
                    addClass(this.slider, this.options.mode);
                }

                this.handle = document.createElement("div");
                this.handle.className = 'jx-handle';
                this.rightImage = document.createElement("div");
                this.rightImage.className = 'jx-image jx-right';
                this.rightImage.appendChild(this.imgAfter.image);
                this.leftImage = document.createElement("div");
                this.leftImage.className = 'jx-image jx-left';
                this.leftImage.appendChild(this.imgBefore.image);
                this.projectName = document.createElement("span");
                this.projectName.className = 'juxtapose-name';
                setText(this.projectName, 'JuxtaposeJS');
                this.slider.appendChild(this.handle);
                this.slider.appendChild(this.leftImage);
                this.slider.appendChild(this.rightImage);
                this.leftArrow = document.createElement("div");
                this.rightArrow = document.createElement("div");
                this.control = document.createElement("div");
                this.controller = document.createElement("div");

                this.leftArrow.className = 'jx-arrow jx-left';
                this.rightArrow.className = 'jx-arrow jx-right';
                this.control.className = 'jx-control';
                this.controller.className = 'jx-controller';

                this.controller.setAttribute('tabindex', 0); //put the controller in the natural tab order of the document
                this.controller.setAttribute('role', 'slider');
                this.controller.setAttribute('aria-valuenow', 50);
                this.controller.setAttribute('aria-valuemin', 0);
                this.controller.setAttribute('aria-valuemax', 100);

                this.handle.appendChild(this.leftArrow);
                this.handle.appendChild(this.control);
                this.handle.appendChild(this.rightArrow);
                this.control.appendChild(this.controller);

                this._init();
            }
        },

        _init: function() {
            if (this.checkImages() === false) {
                console.warn(this, "Check that the two images have the same aspect ratio for the slider to work correctly.");
            }

            this.updateSlider(this.options.startingPosition, false);

            if (this.options.showLabels === true) {
                if (this.imgBefore.label) { this.displayLabel(this.leftImage, this.imgBefore.label); }
                if (this.imgAfter.label) { this.displayLabel(this.rightImage, this.imgAfter.label); }
            }

            if (this.options.showCredits === true) {
                this.displayCredits();
            }

            var self = this;
            window.addEventListener("resize", function() {
                self.setWrapperDimensions();
            });

            this.slider.addEventListener("mousedown", function(e) {
                e = e || window.event;
                e.preventDefault();
                self.updateSlider(e, true);
                animate = true;

                this.addEventListener("mousemove", function(e) {
                    e = e || window.event;
                    e.preventDefault();
                    if (animate) { self.updateSlider(e, false); }
                });

                this.addEventListener('mouseup', function(e) {
                    e = e || window.event;
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeEventListener('mouseup', arguments.callee);
                    animate = false;
                });
            });

            this.slider.addEventListener("touchstart", function(e) {
                e = e || window.event;
                e.preventDefault();
                e.stopPropagation();
                self.updateSlider(e, true);

                this.addEventListener("touchmove", function(e) {
                    e = e || window.event;
                    e.preventDefault();
                    e.stopPropagation();
                    self.updateSlider(event, false);
                });

            });

            this.handle.addEventListener("keydown", function(e) {
                e = e || window.event;
                var key = e.which || e.keyCode;
                var ariaValue = parseFloat(this.style.left);

                if (key === 37) {
                    ariaValue = ariaValue - 1;
                    var leftStart = parseFloat(this.style.left) - 1;
                    self.updateSlider(leftStart, false);
                    self.controller.setAttribute('aria-valuenow', ariaValue);
                }

                if (key === 39) {
                    ariaValue = ariaValue + 1;
                    var rightStart = parseFloat(this.style.left) + 1;
                    self.updateSlider(rightStart, false);
                    self.controller.setAttribute('aria-valuenow', ariaValue);
                }
            });

            this.leftImage.addEventListener("keydown", function(event) {
                var key = event.which || event.keyCode;
                if ((key === 13) || (key === 32)) {
                    self.updateSlider("90%", true);
                    self.controller.setAttribute('aria-valuenow', 90);
                }
            });

            this.rightImage.addEventListener("keydown", function(event) {
                var key = event.which || event.keyCode;
                if ((key === 13) || (key === 32)) {
                    self.updateSlider("10%", true);
                    self.controller.setAttribute('aria-valuenow', 10);
                }
            });

            juxtapose.sliders.push(this);

            if (this.options.callback && typeof(this.options.callback) == 'function') {
                this.options.callback(this);
            }
        }

    };

    juxtapose.makeSlider = function(element, idx) {
        if (typeof idx == 'undefined') {
            idx = juxtapose.sliders.length;
        }

        var w = element;
        var images = w.querySelectorAll('img');

        var options = {};
        if (w.getAttribute('data-animate')) {
            options.animate = w.getAttribute('data-animate');
        }
        if (w.getAttribute('data-showlabels')) {
            options.showLabels = w.getAttribute('data-showlabels');
        }
        if (w.getAttribute('data-showcredits')) {
            options.showCredits = w.getAttribute('data-showcredits');
        }
        if (w.getAttribute('data-startingposition')) {
            options.startingPosition = w.getAttribute('data-startingposition');
        }
        if (w.getAttribute('data-mode')) {
            options.mode = w.getAttribute('data-mode');
        }
        if (w.getAttribute('data-makeresponsive')) {
            options.mode = w.getAttribute('data-makeresponsive');
        }

        specificClass = 'juxtapose-' + idx;
        addClass(element, specificClass);
        selector = '.' + specificClass;

        if (w.innerHTML) {
            w.innerHTML = '';
        } else {
            w.innerText = '';
        }

        slider = new juxtapose.JXSlider(
            selector, [{
                    src: images[0].src,
                    label: images[0].getAttribute('data-label'),
                    credit: images[0].getAttribute('data-credit'),
                    alt: images[0].alt
                },
                {
                    src: images[1].src,
                    label: images[1].getAttribute('data-label'),
                    credit: images[1].getAttribute('data-credit'),
                    alt: images[1].alt
                }
            ],
            options
        );
    };

    juxtapose.scanPage = function() {
        var elements = document.querySelectorAll('.joys');
        for (var i = 0; i < elements.length; i++) {
            juxtapose.makeSlider(elements[i], i);
        }
    };

    juxtapose.JXSlider = JXSlider;
    window.juxtapose = juxtapose;

    juxtapose.scanPage();
}(document, window));

!window.addEventListener && (function(WindowPrototype, DocumentPrototype, ElementPrototype, addEventListener, removeEventListener, dispatchEvent, registry) {
    WindowPrototype[addEventListener] = DocumentPrototype[addEventListener] = ElementPrototype[addEventListener] = function(type, listener) {
        var target = this;

        registry.unshift([target, type, listener, function(event) {
            event.currentTarget = target;
            event.preventDefault = function() { event.returnValue = false };
            event.stopPropagation = function() { event.cancelBubble = true };
            event.target = event.srcElement || target;

            listener.call(target, event);
        }]);

        this.attachEvent("on" + type, registry[0][3]);
    };

    WindowPrototype[removeEventListener] = DocumentPrototype[removeEventListener] = ElementPrototype[removeEventListener] = function(type, listener) {
        for (var index = 0, register; register === registry[index]; ++index) {
            if (register[0] === this && register[1] === type && register[2] === listener) {
                return this.detachEvent("on" + type, registry.splice(index, 1)[0][3]);
            }
        }
    };

    WindowPrototype[dispatchEvent] = DocumentPrototype[dispatchEvent] = ElementPrototype[dispatchEvent] = function(eventObject) {
        return this.fireEvent("on" + eventObject.type, eventObject);
    };
})(Window.prototype, HTMLDocument.prototype, Element.prototype, "addEventListener", "removeEventListener", "dispatchEvent", []);