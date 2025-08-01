/*

Envy by WeTheme (http://www.wetheme.com)
Section JS

*/

(function ($) {

// MatchHeight

function toHandle(o) {
    return o.toLowerCase().replace(/[()]/g, '').replace(/[\W]/g, '-');
}


function load_icons() {
    // If we use wrong icon, whole feather will crash and no further icons will be loaded
    // this will check if icons are vaild and will remove the feather if not
    var icons = Object.keys(feather.icons);
    Array.prototype.forEach.call(
        document.querySelectorAll('[data-feather]'),
        function (el) {
            var icon = el.dataset.feather;
            if (icons.indexOf(icon) < 0) {
                console.warn('No such icon "' + icon + '" in feather, element', el);
                el.dataset.featherInvalid = icon;
                delete el.dataset.feather;
            }
        }
    );
    try {
        feather.replace();
    } catch (e) {
        console.error('Unable to load icons:', e);
    }
}

// Instagram section

var INSTAGRAM_SELECTOR = '.instagram-wrapper';


// Workaround for bug in chrome causing first attempt to open dropdown to fail
// https://github.com/Dogfalo/materialize/issues/6322
$.fn.original_material_select = $.fn.material_select;
$.fn.material_select = function () {
    $(this).original_material_select();
    Array.prototype.forEach.call(
        document.querySelectorAll('.select-wrapper'),
        function (t) {
            t.addEventListener('click', function (e) {
                e.stopPropagation();
            });
        }
    );
};

function instagramSort(data, sortKey) {
    var compareFn;
    switch (sortKey) {
        case 'none':
            compareFn = function (entry1, entry2) {
                return parseInt(entry2.created_time) - parseInt(entry1.created_time);
            }
            break;
        case 'most-liked':
            compareFn = function (entry1, entry2) {
                return entry2.likes.count - entry1.likes.count;
            }
            break;
        case 'most-commented':
            compareFn = function (entry1, entry2) {
                return entry2.comments.count - entry1.comments.count;
            }
            break;
        case 'random':
            compareFn = function () {
                return Math.random() > 0.5;
            }
            break;
    }
    data.sort(compareFn);
}

function instagram_fetch(url, results, count, callback) {
    $.getJSON({
        url: url + '&callback=?',
        crossDomain: true,
        dataType: "jsonp",
    })
        .done(function (data) {
            var entries = data.data;
            entries.forEach(function (entry) {
                if (results.length >= count) {
                    return;
                }
                if (entry.type !== 'image') {
                    return;
                }
                results.push(entry);
            });
            if (results.length < count && data.pagination && data.pagination.next_url) {
                return instagram_fetch(data.pagination.next_url, results, count, callback);
            } else {
                return callback(results, null);
            }
        })
        .fail(function (jqXHR) {
            var errorMessage;
            try {
                errorMessage = jqXHR.responseJSON.meta.error_message;
            } catch (e) {
                errorMessage = 'Unknown error';
            }
            return callback(results, errorMessage);
        });
}

function instagram_init(instagram_element) {
    var section = instagram_element.dataset.id;

    // Read the Instagram token
    var token_input = document.querySelector('#token-' + section);
    if (!token_input) {
        // We don't have a token, no data are available and placeholder is shown
        return;
    }
    var token = token_input.value;

    // Set up options for Instafeed
    var target = document.querySelector('#instafeed-' + section);
    var rows = parseInt(target.dataset.rows),
        grid = parseInt(target.dataset.grid),
        sortBy = target.dataset.sortBy,
        count = rows * grid,
        $target = $(target);

    // Instagram paginates the data and filters out private images after getting required `count`.
    // we'll requests many more images than needed, but will be paginated anyway, so we'll read
    // as many pages as needed for requested number of images
    var url = 'https://api.instagram.com/v1/users/self/media/recent?access_token=' + token + '&count=1000';
    instagram_fetch(url, [], count, function (results, errorMessage) {
        if (errorMessage) {
            if (Shopify.designMode) {
                $target.empty();
                $target.css('position', 'relative');
                $('<div class="instagram-container-error"></div>').text(errorMessage).appendTo($target);

                var placeholder = document.querySelector('#instagram-placeholder').textContent;
                for (var i = 0; i < count; i++) {
                    $(placeholder).appendTo($target)
                }
            } else {
                $target.closest('.homepage-section--instagram-wrapper').hide();
            }

            console.error('Unable to load instagram data:', errorMessage);
        } else {
            $target.empty();
            $target.closest('.homepage-section--instagram-wrapper').show();
            instagramSort(results, sortBy);
            results.forEach(function (entry) {
                var image = entry.images;
                var div = document.createElement('div');
                div.classList.add('instagram-indiv');
                div.classList.add('instagram-grid-' + grid);
                var link = document.createElement('a');
                link.href = entry.link;
                link.target = '_blank';
                var img = document.createElement('img');
                img.src = image.thumbnail.url;
                img.dataset.src = image.thumbnail.url;
                img.dataset.srcset = (
                    image.thumbnail.url + ' ' + image.thumbnail.width + 'w, ' +
                    image.low_resolution.url + ' ' + image.low_resolution.width + 'w,' +
                    image.standard_resolution.url + ' ' + image.standard_resolution.width + 'w'
                );
                img.dataset.sizes = 'auto';
                img.classList.add('lazyload');
                img.classList.add('instagram-image');
                div.appendChild(link);
                link.appendChild(img);
                target.appendChild(div);
            });
        }
    });
}

function load_instagram(target) {
    var instagram_elements = target.querySelectorAll(INSTAGRAM_SELECTOR);
    Array.prototype.forEach.call(instagram_elements, instagram_init);
}


// Slider section

var DEFAULT_OPTIONS = {
    directionNav: true,
    controlNav: true,
    startAt: 0
};

var SLIDER_SELECTOR = '.flexslider-homepage';
var SLIDER_REENABLE_INTERVAL = 6000;

/* Mapping from sectionId to Slider instance */
var sliders = {};

/* Initialize all the sliders */
function load_slider(section) {
    sliders = {};
    section = section || document;
    var slider_elements = section.querySelectorAll(SLIDER_SELECTOR);
    Array.prototype.forEach.call(slider_elements, function (slider_element) {
        // Prevent flickering in the flexslider by setting fixed width of the slides
        $(slider_element).find('.slides li').css('width', $(slider_element).width());

        sliders[slider_element.dataset.sliderId] = new Slider(slider_element);

    });
}

/* Mapping from sectionId to Testimonial instance */
var testimonials = {};

/* Initialize all the testimonials */
function load_testimonial(section) {
    testimonials = {};
    section = section || document;
    var slider_elements = section.querySelectorAll('.flexslider-homepage-testimonial');
    Array.prototype.forEach.call(slider_elements, function (slider_element) {
        // Prevent flickering in the flexslider by setting fixed width of the slides
        $(slider_element).find('.slides li').css('width', $(slider_element).width());

        testimonials[slider_element.dataset.sliderId] = new Slider(slider_element);

    });
}

function Slider(element) {
    this.$element = $(element);
    this.restartTimer = null;

    this.get_speed = function () {
        return parseInt(this.$element.data('sliderSlideTime'));
    };

    this.get_id = function () {
        return this.$element.data('sliderId');
    };

    this.get_smooth_height_state = function(){
        return $(window).width() < 767;
    };

    this.get_animation = function () {
        return this.$element.data('sliderAnimation');
    };

    this.show_slide = function (index) {
        if (this.get_speed() > 0) {
            this.$element.flexslider("stop");
        }
        this.$element.flexslider(index);
    };

    this.start_animation = function () {
        // Don't start animation when autorotate is disabled
        if (this.get_speed() > 0) {
            this.$element.flexslider("play");
        }
    };

    this.on_slide_change = function(slider) {
        var speed = this.get_speed();
        if (!slider.playing && speed > 0) {
            // restart autoscroll after given interval since last interaction
            clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(function () {
                slider.play();
            }, Math.max(0, SLIDER_REENABLE_INTERVAL - speed));
        }
    };

    this.configure = function (options) {
        if ($(window).width() === 0) {
            // the app is not yet loaded in the admin, retry later
            setTimeout(this.configure.bind(this), 200);
            return;
        }
        var speed = this.get_speed();
        var id = this.get_id();

        if($('.slider-pagination-container.slider--'+id).length === 0){
          DEFAULT_OPTIONS.controlNav = false;
        } else {
          DEFAULT_OPTIONS.controlNav = true;
        }

        if($('.flex-direction-nav.slider--'+id+' a').length === 0){
          DEFAULT_OPTIONS.directionNav = false;
        } else {
          DEFAULT_OPTIONS.directionNav = true;
        }

        var opts = $.extend({
                controlsContainer: this.$element,
                slideshowSpeed: speed,
                animation: this.get_animation(),
                controlsContainer: $('.slider-pagination-container.slider--'+id),
                customDirectionNav: $('.flex-direction-nav.slider--'+id+' a'),
                slideshow: speed > 0,
                pauseOnAction: true,
                after: this.on_slide_change.bind(this)
            }, DEFAULT_OPTIONS, options);
        this.$element.find('ul.slides').width('auto');
        this.$element.flexslider(opts);
    };
    this.configure({});

    // flexslider stops the animation when the page is not focused, this breaks when the section is
    // changed in theme admin because it triggers 'blur' event when another iframe is selected
    $(window).off('blur');
}



// Product template section

function load_tabs() {
    $('ul.tabs').each(function() {
        var active, content, links = $(this).find('a');
        active = links.first().addClass('active');
        content = $(active.attr('href'));
        links.not(':first').each(function () {
            $($(this).attr('href')).hide();
        });
        $(this).find('a').on('click', function(e){
            active.removeClass('active');
            content.hide();
            active = $(this);
            content = $($(this).attr('href'));
            active.addClass('active');
            content.fadeIn();
            return false;
        });
    });
}

function apply_zoom(target) {
    var $target = $(target);
    var img = $target.find('img')[0];
    var duration = 120;
    var timer = null;
    $target.zoom({
        url: img.dataset.zoomImg || img.src,
        touch: false,
        duration: duration,
        onZoomIn: function () {
            // Hide zoomed image when it's smaller then parent div,
            // it would just move but there won't be any zoom
            if ($target.width() >= $(this).width()) {
                $target.find('.zoomImg').addClass('hide');
                return;
            } else {
                $target.find('.zoomImg').removeClass('hide');
            }

            // Hide image when zoomed image is hovered - to prevent
            // both images visible when the image is too small
            timer = setTimeout(function () {
                img.classList.add('product-image-hidden');
                timer = null;
            }, duration);
        },
        onZoomOut: function () {
            if (timer) {
                clearTimeout(timer);
            }
            img.classList.remove('product-image-hidden');
        }
    });
}

function load_zoom() {
    $('*[data-zoom=true]').each(function () {
        apply_zoom(this);
    });
}


function formatMoney(cents, format) {
    var moneyFormat = theme.moneyFormat; // eslint-disable-line camelcase
    if (typeof cents === 'string') {
        cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = (format || moneyFormat);

    function formatWithDelimiters(number, precision, thousands, decimal) {
        if (precision === null || precision === undefined) {
            precision = 2;
        }
        thousands = thousands || ',';
        decimal = decimal || '.';

        if (isNaN(number) || number == null) {
            return 0;
        }

        number = (number / 100.0).toFixed(precision);

        var parts = number.split('.');
        var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
        var centsAmount = parts[1] ? (decimal + parts[1]) : '';

        return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
        case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
        case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
        case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
        case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
        case 'amount_no_decimals_with_space_separator':
            value = formatWithDelimiters(cents, 0, ' ');
            break;
    }

    return '<span class="money">' + formatString.replace(placeholderRegex, value) + '</span>';
}

function Product(element) {
    var product = this;
    // Settings
    this.config = {
        shopify_ajax_add_url: '/cart/add.js',
        shopify_ajax_url: '/cart.js'
    };

    this.element = element;
    this.$element = $(element);

    this.sectionId = this.element.dataset.sectionId;
    var product_script = document.querySelector('#ProductJson-' + this.sectionId);
    if (!product_script) {
        // Product is not loaded, there is either no product section or the product is not selected
        return;
    }
    this.product = JSON.parse(document.querySelector('#ProductJson-' + this.sectionId).innerText);
    this.$selects = this.$element.find('.selector-wrapper select, .materialize-select select');
    this.$selects.on('change', this.on_select_change.bind(this));
    this.$original_select = this.$element.find('.original-select');
    this.$old_price = this.$element.find('.compare-at-price .money');
    this.$price = this.$element.find('#price-field');
    this.$cart = this.$element.find('#purchase');
    this.$spb = this.$element.find('.shopify-payment-button');
    this.$sale = this.$element.find('.sale-badge,.compare-at-price');
    this.$sale_price = this.$element.find('.compare-at-price');
    this.$variant_percentage_wrapper = this.$element.find('.variant-percentage-wrapper');
    this.$variant_value_wrapper = this.$element.find('.variant-value-wrapper');
    this.$variant_value = this.$element.find('.variant-value');
    this.$featured_image_wrapper = this.$element.find('.featured-image-div');
    this.$featured_image = this.$element.find('.product-main-image');
    this.$add_to_cart_form = this.$element.find('#add-to-cart-form');
    this.$mobile_slider = this.$element.find('.mobile-product-slider');
    this.$cart_slider_wrapper = $('#cartSlideoutWrapper');
    this.$thumbnail_wrapper = this.$element.find('.product-thumbnails-wrapper');
    this.$thumbnails = this.$thumbnail_wrapper.find('a.image-swap');
    this.$swatch_inputs = this.$element.find('#add-to-cart-form').find('.swatch input');
    this.$sku = this.$element.find('.indiv-product-sku-text');
    this.zoom_selector = '.zoomImg';
    this.thumbnail_changes_variant = this.$element.find('#thumbnail_changes_variant').val() === 'true';
    this.added_text_timeout = null;
    this.is_variant_switch_manual = false;

    if (this.$swatch_inputs.length > 0) {
        // Check swatched based on variant
        this.on_swatch_change();
    } else {
        // Fill variant based on selection
        this.on_select_change();
    }
    this.$cart.on('click', function(e) {
        e.preventDefault();
        this.disable_cart_button();
        this.add_to_cart();
    }.bind(this));

    // Change product (if enabled) when thumbnail is clicked
    this.$thumbnails.on('click', function (e) {
        this.on_thumbnail_click(e.currentTarget);
        return false;
    }.bind(this));

    this.$swatch_inputs.on('change', this.on_swatch_change.bind(this));

    // Change product (if enabled) when slider changes (on mobile and in quick shop section)
    var slider = this.$mobile_slider.data('flexslider');
    if (!slider) {
        return;
    }
    var old_after = slider.vars.after;
    slider.vars.after = function () {
        old_after();
        if (!this.is_variant_switch_manual) {
            this.on_mobile_slider_change();
        }
        this.is_variant_switch_manual = false;
    }.bind(this);
}

Product.prototype.set_featured_image = function ($newImage) {
    var clone = $newImage.clone().removeClass('lazyloaded').addClass('lazyload product-main-image')
    this.$featured_image.replaceWith(clone);
    this.$featured_image = clone;
    this.$featured_image_wrapper.find('.zoomImg').remove();
    if (this.$featured_image_wrapper.data('zoom')) {
        apply_zoom(this.$featured_image_wrapper);
    }
};

Product.prototype.set_variant_options = function (values) {
    var matching_variants = this.product.variants.filter(function (variant) {
        for (var i = 0; i < values.length; i++) {
            if (values[i] !== variant.options[i]) {
                return false
            }
        }
        return true;
    });
    if (matching_variants.length === 0) {
        this.update_variant(null);
    } else {
        this.update_variant(matching_variants[0]);
    }
};

Product.prototype.on_select_change = function () {
    var values = this.$selects.map(function (index, select) {
        return $(select).val();
    });
    this.set_variant_options(values);
};

Product.prototype.on_swatch_change = function () {
    var values = [];
    this.$add_to_cart_form.serializeArray().forEach(function (option) {
        if (option.name.indexOf('option-') === 0) {
            values[parseInt(option.name.split('-')[1], 10)] = option.value;
        }
    });
    this.set_variant_options(values);
};

Product.prototype.on_thumbnail_click = function (thumbnail) {
    // swap image
    var $thumbnail = $(thumbnail);
    var newImage = $thumbnail.find('img').eq(0);
    this.set_featured_image(newImage);

    // select variant
    if (this.thumbnail_changes_variant) {
        var variant_id = $thumbnail.data('variant');
        if (variant_id) {
            this.on_variant_selected(variant_id);
        }
    }
};

Product.prototype.on_mobile_slider_change = function () {
    var variant_id = this.$mobile_slider.find('.flex-active-slide img').data('variant');
    if (variant_id) {
        this.on_variant_selected(variant_id);
    }
};

Product.prototype.on_variant_selected = function (variant_id) {
    var matching_variants = this.product.variants.filter(function (variant) {
        return variant.id == variant_id;
    });
    if (matching_variants.length === 0) {
        this.update_variant(null);
    } else {
        var variant = matching_variants[0];
        this.update_variant(matching_variants[0]);
        for (var i = 0; i < variant.options.length; i++) {
            this.$element.find('#SingleOptionSelector-' + i).val(variant.options[i]).material_select();
        }
    }
};

Product.prototype.update_variant = function (variant) {
    if (variant) {
        this.$original_select.val(variant.id);

        var is_sale = variant.compare_at_price && variant.compare_at_price > variant.price;
        this.$sale.toggleClass('hide', !is_sale);
        if (variant.sku) {
            this.$sku.text(variant.sku);
        }
        this.$sku.toggleClass('hide', !variant.sku);

        if (!variant.available) {
            this.$price.text(theme.strings.soldOut);
            this.$sale_price.text('');
            this.$cart.prop('disabled', true);
            this.$spb.css({'opacity':1}).animate({'opacity':0}).hide();
            this.$cart.text('Sold Out');
            if (this.$variant_percentage_wrapper.length > 0) {
                this.$variant_percentage_wrapper.addClass('hide');
            } else if (this.$variant_value_wrapper.length > 0) {
                this.$variant_value_wrapper.addClass('hide');
            }
            $.event.trigger({
                type: "variantUnavailable",
                time: new Date(),
                variant: variant
            });
        } else {
            this.$price.html(formatMoney(variant.price));
            this.$sale_price.html(is_sale ? formatMoney(variant.compare_at_price) : '');
            this.$cart.prop('disabled', false);
            this.$spb.show().css({'opacity':1}).animate({'opacity':1});
            this.$cart.text('Add to Cart');
            if (this.$variant_percentage_wrapper.length > 0 && variant.compare_at_price > variant.price) {
                this.$variant_percentage_wrapper.removeClass('hide');
                var percentage = (variant.compare_at_price - variant.price) * 100.0 / variant.compare_at_price;
                this.$variant_percentage_wrapper.find('.variant-percentage').text(percentage.toFixed(0) + '%');
            } else {
                this.$variant_percentage_wrapper.addClass('hide');
            }
            if (this.$variant_value_wrapper.length > 0 && variant.compare_at_price > variant.price) {
                this.$variant_value_wrapper.removeClass('hide');
                var value = variant.compare_at_price - variant.price;
                this.$variant_value_wrapper.find('.variant-value').html(formatMoney(value));
            } else {
                this.$variant_value_wrapper.addClass('hide');
            }

            $.event.trigger({
                type: "variantAvailable",
                time: new Date()
            });
        }
        if (variant.featured_image) {
            var $thumbnail = this.$thumbnail_wrapper.find('[data-image-id="' + variant.featured_image.id + '"] img');
            if ($thumbnail.length > 0) {
                this.set_featured_image($thumbnail);
            }

            var slider = this.$element.find('.mobile-product-slider');
            if (slider.length === 0) {
                slider = this.$element.find('.homepage-sections--indiv-product-slider');
            }
            var li_to_activate = slider.find('li:not(.clone) [data-image-id="' + variant.featured_image.id + '"]').closest('li');
            var index = slider.data('flexslider').slides.index(li_to_activate);
            if (index > -1) {
                this.is_variant_switch_manual = true;
                slider.flexslider(index);
            }
        }

        var is_indiv_product = this.$element.closest('.shopify-section').hasClass('homepage-section--indiv-product-wrapper');
        var has_more_variants = this.product.variants.length > 1;
        if (window.history.replaceState && !is_indiv_product && has_more_variants) {
            // Change url to include variant if we're not on homepage
            var search = [];
            if (window.location.search.length > 1) {
                // select non-variant query params
                search = window.location.search.slice(1).split('&').filter(function (q) {
                    return q.indexOf('variant=') !== 0;
                });
            }
            // add current variant
            search.push('variant=' + variant.id);

            // set the url to include the variant
            var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?' + search.join('&');
            window.history.replaceState({path: newurl}, '', newurl);
        }

        // Swatches
        if (this.$swatch_inputs.length > 0) {
            var section_id = this.$element.data('section-id');
            variant.options.forEach(function (option, index) {
                this.$swatch_inputs.filter('#section-' + section_id + '-swatch-' + index + '-' + toHandle(option)).prop('checked', true);
            }.bind(this));
        }
    } else {
        var make_a_selection = this.$selects.filter(function (index, select) {
            return $(select).val() === '';
        }).length > 0;
        if (make_a_selection) {
            this.$price.text(theme.strings.make_a_selection);
        } else {
            this.$price.text(theme.strings.unavailable);
        }
        this.$cart.prop('disabled', true);
        this.$sale.addClass('hide');
        this.$variant_percentage_wrapper.addClass('hide');
        this.$variant_value_wrapper.addClass('hide');
        this.$sku.addClass('hide');
    }
    if (window.Currency && Currency.shopCurrency) {
        Currency.convertAll(Currency.shopCurrency, Currency.currentCurrency);
    }
};

var CART_LOADING = '<div class="lds-dual-ring"></div><span class="sr-only">Loading...</span>';

Product.prototype.add_to_cart = function () {
    this.clear_error();

    $.ajax({
        url: this.config.shopify_ajax_add_url,
        dataType: 'json',
        type: 'post',
        data: this.$add_to_cart_form.serialize(),
        success: this.added_to_cart.bind(this),
        error: this.add_to_cart_failed.bind(this)
    });
};

Product.prototype.disable_cart_button = function () {
    if (this.added_text_timeout) {
        clearTimeout(this.added_text_timeout);
        this.added_text_timeout = null;
    }
    this.$cart.addClass('disabled').prop('disabled', true).html(CART_LOADING);
};

Product.prototype.enable_cart_button = function () {
    if (this.added_text_timeout) {
        clearTimeout(this.added_text_timeout);
        this.added_text_timeout = null;
    }
    this.$cart.removeClass('disabled').prop('disabled', false).html(window.theme.strings.addToCart);
};

Product.prototype.added_to_cart = function (itemData) {
    this.update_cart();
};

Product.prototype.open_cart_page = function () {
    window.location = '/cart';
};

Product.prototype.show_cart = function () {
    this.$cart_slider_wrapper.trigger('cart:open');
};

Product.prototype.update_cart = function () {
    // Update cart count
    $.getJSON(this.config.shopify_ajax_url)
        .then(this.updated_cart.bind(this))
        .fail(this.update_cart_failed.bind(this));
};

Product.prototype.updated_cart = function (data) {
    update_cart_drawer(data);
    this.enable_cart_button();

    var cart_action = this.$cart.data('cart-action');
    if (cart_action === 'cart') {
        this.open_cart_page();
    } else if (cart_action === 'added') {
        this.$cart.html(window.theme.strings.added);
        if (this.added_text_timeout) {
            clearTimeout(this.added_text_timeout);
            this.added_text_timeout = null;
        }
        this.added_text_timeout = setTimeout(function () {
            this.$cart.html(window.theme.strings.addToCart);
        }.bind(this), 2000);
    } else {
        // cart_action === drawer
        this.show_cart();
    }
};

Product.prototype.update_cart_failed = function (response) {
    this.enable_cart_button();
    console.error("Updating the cart failed: ", response);
};

Product.prototype.add_to_cart_failed = function(response) {
    this.enable_cart_button();
    var errorText = 'Unknown error';
    if (response.status == 0) {
        // Unable to connect to server
    } else if (response.responseJSON) {
        // Process JSON error
        if (response.responseJSON.description) {
            errorText = response.responseJSON.description;
        } else {
            errorText = response.responseJSON.message;
        }
    } else if (response.responseText) {
        // Use plain text error
        errorText = response.responseText;
    }
    this.show_error(errorText);
};

Product.prototype.show_error = function (text) {
    $('<div id="cart-error"></div>')
        .addClass('alert alert-danger')
        .text(text)
        .insertAfter(this.$cart);
};

Product.prototype.clear_error = function () {
    $('#cart-error').remove();
};

function load_product(target) {
    if (target) {
        new Product(target.querySelector('#product-box'));
    } else {
        Array.prototype.forEach.call(document.querySelectorAll('#product-box'), function (box) {
            new Product(box);
        });
    }
}

function load_product_recommendations() {
    // Look for an element with class 'product-recommendations'
    var productRecommendationsSection = document.querySelector(".product-recommendations");
    if (productRecommendationsSection === null) {
        return;
    }
    // Read product id from data attribute
    var productId = productRecommendationsSection.dataset.productId;
    // Read limit from data attribute
    var limit = productRecommendationsSection.dataset.limit;
    // Build request URL
    var requestUrl = "/recommendations/products?section_id=product-recommendations&limit="+limit+"&product_id="+productId;
    // Create request and submit it using Ajax
    var request = new XMLHttpRequest();
    request.open("GET", requestUrl);
    request.onload = function() {
        if (request.status >= 200 && request.status < 300) {
            var container = document.createElement("div");
            container.innerHTML = request.response;
            productRecommendationsSection.parentElement.innerHTML = container.querySelector(".product-recommendations").innerHTML;
        }
    };
    request.send();
}

var FADE_OUT_ANIMATION_DURATION = 800; // ms

function update_cart_drawer(data) {
    $('.cart-error-box').text('');

    if (data.items.length === 0) {
        $('.cart-empty-box,.ajax-cart--total-price').removeClass('hide');
        $('.ajax-cart--total-price,.cart-button-checkout').addClass('hide');
    } else {
        $('.cart-empty-box').addClass('hide');
        $('.ajax-cart--total-price,.cart-button-checkout').removeClass('hide');
    }

    var template = $('#cart-item-template').html();
    var $cart_items = $('.cart-items');
    $cart_items.empty();
    data.items.forEach(function (item, index) {
        var $cart_item = $(template);
        if (item.image) {
            $cart_item.find('.cart-item-image').attr({
                src: item.image,
                alt: item.product_title,
            });
        } else {
            $cart_item.find('.cart-item-image').css('display', 'none');
        }
        $cart_item.find('.cart-item-link').attr({
            href: item.url,
        });
        $cart_item.find('.cart-item-product-title').text(item.product_title);
        $cart_item.find('.cart-item-variant-title').text(item.variant_title);
        $cart_item.find('.cart-item-price').html(formatMoney(item.final_line_price));
        var $original_price = $cart_item.find('.cart-item-price-original');
        if (item.original_line_price > item.final_line_price) {
            $original_price.html(formatMoney(item.original_line_price)).show();
        } else {
            $original_price.hide();
        }
        var quantity = $cart_item.find('.cart-item-quantity');
        var quantity_wrapepr = quantity.closest('.cart-item--quantity-wrapper');
        var update_quantity = function (quantity) {
            quantity_wrapepr.addClass('cart-item-quantity-active');
            var fade = quantity <= 0;
            var delay = fade ? FADE_OUT_ANIMATION_DURATION : 0;
            cart_set_quantity(delay).always(function () {
                quantity_wrapepr.removeClass('cart-item-quantity-active');
                if (fade) {
                    $cart_item.addClass('fadeOut animated fast');
                    setTimeout(function () {
                        $cart_item.remove();
                    }, FADE_OUT_ANIMATION_DURATION);
                }
            });
        };
        quantity.on('change', function () {
            var new_q = parseInt($(this).val(), 10);
            update_quantity(new_q);
        });
        quantity.val(item.quantity);
        quantity.attr('name', 'updates[' + item.variant_id + ']');

        $cart_item.find('.cart-item-quantity-button').on('click', function () {
            var current = parseInt(quantity.val(), 10);
            var change = parseInt(this.dataset.amount, 10);
            var new_q = current + change;
            quantity.val(new_q);
            update_quantity(new_q);
        });

        var $discounts = $cart_item.find('.order-discount--cart-list').empty();
        item.line_level_discount_allocations.forEach(function (discount_allocation) {
            var $item = $('<li class="order-discount--item"></li>');
            $('<span class="order-discount--item"></span>').text(discount_allocation.discount_application.title).appendTo($item);
            $('<span class="order-discount--cart-title"></span>').html('-' + formatMoney(discount_allocation.amount)).appendTo($item);
            $discounts.append($item);
        });

        $cart_item.appendTo($cart_items);
    });

    $('.cart-item-count, .cart-item-count-header--quantity').text(data.item_count);
    $('.cart-item-total-price, .cart-item-count-header--total').html(formatMoney(data.total_price));

    var $original_price = $('.cart-item-original-total-price');
    if (data.original_total_price > data.total_price) {
        $original_price.html(formatMoney(data.original_total_price)).show();
    } else {
        $original_price.hide();
    }

    var $cart_discount = $('.ajax-cart-discount-wrapper').empty();
    data.cart_level_discount_applications.forEach(function (discount_application) {
        var $item = $('<div class="cart--order-discount-wrapper--indiv"></div>');
        $('<span class="order-discount"></span>').html('-' + formatMoney(discount_application.total_allocated_amount)).appendTo($item);
        $('<span class="order-discount--cart-title"></span>').text(discount_application.title).appendTo($item);
        $cart_discount.append($item);
    });
    if (window.Currency && Currency.shopCurrency) {
        Currency.convertAll(Currency.shopCurrency, $('[name=currencies]').val());
    }
}

function cart_set_quantity(delay) {
    var deferred = $.Deferred();

    $('.cart-error-box').text('');

    $.ajax({
        type: "POST",
        url: '/cart/update.js',
        dataType: 'json',
        data: $('.cart-drawer-form').serialize(),
    })
        .then(function (data) {
            deferred.resolve();
            setTimeout(function () {
                update_cart_drawer(data);
            }, delay);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            deferred.reject();
            console.error('Cart error', textStatus, jqXHR, errorThrown);
            $('.cart-error-box').empty().text('Unable to update item quantity');
        });

    return deferred;
}

function load_cart_drawer(data) {
    var initial = document.querySelector('#initial-cart');
    if (!initial) {
        return;
    }
    var data = JSON.parse(initial.textContent);
    update_cart_drawer(data);

    $('.cart-button-checkout').on('click', function (e) {
        var $this = $(this);
        $this.find('.cart-button-checkout-text').addClass('hide');
        $this.find('.cart-button-checkout-spinner').removeClass('hide');
    })
}

// Flexslider Mobile Product Images

function load_mobile_product_slider() {
    $('.mobile-product-slider').flexslider({
        animation: 'slide',
        directionNav: false,
        controlNav: true,
        startAt: 0,
        slideshow: false
    });
}

// Flexslider in Indiv Product section

function load_indiv_product_slider() {
    $('.homepage-sections--indiv-product-slider').flexslider({
        directionNav: false,
        slideshow: false,
        animation: "slide"
    });
}

// Mobile menu hierarchy handling


function MobileMenu() {
    var self = this;
    this.menu_structure = JSON.parse(document.querySelector('#mobile-menu-data').innerText);
    var $menu = $('#mobile-menu');
    this.$menu = $menu;
    this.$submenu = $('#mobile-submenu');

    $('.mobile-menu-sub').off('click').on('click', function () { self.menu_click($(this), $menu); });
    $('.mobile-menu-back').off('click').on('click', function () { self.back_click($(this)); });
}

MobileMenu.prototype.menu_click = function ($link, $menu) {
    var self = this;
    this.clear_submenus($menu);
    var handle = $link.data('link');

    if (handle === 'mobile-menu-currency') {
        $('#mobile-menu-currency').removeClass('mobile-menu-hidden');
        return;
    }

    this.menu_structure[handle].links.forEach(function (link) {
        var menu = self.menu_structure[link];
        var $li = $('<li></li>');
        var $a = $('<a></a>')
            .attr('href', menu.url)
            .html(menu.title);
        $li.append($a);
        if (menu.links.length > 0) {
            var $btn = $('<a href="#" class="mobile-menu-sub mobile-menu-right mobile-menu-link"><i data-feather="chevron-right" aria-hidden="true"></i></a>')
                .data('link', link)
                .on('click', function () { self.menu_click($(this), self.$submenu); });
            $li.append($btn);
        }
        $menu.append($li);
    });
    $menu.removeClass('mobile-menu-hidden');
    load_icons();
};

MobileMenu.prototype.clear_submenus = function ($menu) {
    $menu.find('> li:not(:first)').remove();
};

MobileMenu.prototype.back_click = function ($link) {
    $link.parents('.mobile-menu').addClass('mobile-menu-hidden');
};

function load_mobile_menu() {
    new MobileMenu();

    $('.mobile-menu-currency-link').on('click', function () {
        var $this = $(this);
        var code = $this.data('code');
        $(document).trigger("currency:change", code);
    });

    $(document).on("currency:change", function (event, currency) {
        // Select current currency in the mobile menu when global select changes
        $('.mobile-menu-currency-selected').removeClass('mobile-menu-currency-selected').find('svg').remove();
        $('.mobile-menu-currency-link[data-code=' + currency +']').addClass('mobile-menu-currency-selected').append($('<i data-feather="check" aria-hidden="true"></i>'));
        load_icons();
    });
}

// Parallax effect for the Text over image section

function Parallax(target) {
    this.target = target;
    this.$target = $(target);
    this.img = target.querySelector(".img");
    this.active = false;

    // Wait for image load
    this.$target.children(".img").one("load", function() {
        this.init();
        this.img.style.display = 'block';
    }.bind(this)).each(function() {
        if (this.complete || !this.src) $(this).trigger('load');
    });

    window.addEventListener('scroll', this.update.bind(this), {
        capture: true,
        passive: true
    });
    window.addEventListener('resize', this.init.bind(this));
}

Parallax.prototype.init = function () {
    this.img_height = $(this.img).height();
    this.container_height = (this.$target.height() > 0 ? this.$target.height() : this.img_height) || 500;

    // Parallax is disabled on mobile
    this.active = !window.matchMedia("screen and (max-width: 767px)").matches;
    this.update();
};

Parallax.prototype.update = function () {
    if (!this.active) {
        this.img.style.transform = "";
        return;
    }
    var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;

    var parallax_dist = this.img_height - this.container_height;
    var top = this.target.getBoundingClientRect().top + scrollTop;
    var bottom = top + this.container_height;
    var windowHeight = window.innerHeight;
    var windowBottom = scrollTop + windowHeight;
    var percentScrolled = (windowBottom - top) / (this.container_height + windowHeight);
    var parallax = parallax_dist * percentScrolled;

    if ((bottom > scrollTop) && (top < (scrollTop + windowHeight))) {
        this.img.style.transform = "translate3D(-50%," + parallax + "px, 0)";
    }
}

function load_parallax() {
    $('.parallax').each(function () {
        new Parallax(this);
    });
}

function load_mobile_text_adverts() {
    $('.mobile-homepage-text-adverts').flexslider({
      controlNav: true,
      directionNav: false,
      animation: 'slide'
    });
}

function load_search() {
  $(document).ready(function(){

      $(".search-show").off('click').on('click', function(){
          var $this = $(this);
          if ($this.closest('.sticky-header-wrapper').length > 0) {
            var $search = $('.sticky-header-search');
            $search.toggleClass('expanded');
            $search.find('#search_text').focus();
          } else {
            $("#top-search-wrapper").toggleClass('expanded');
            $("#top-search-wrapper #search_text").focus();
          }
          return false;
      });

      if($(window).width() < 767){
          $('.mobile-menu-close').trigger('click');
      }
  });
}

var dropdown_timeout = null;

function dropdown_handle_hover() {
    // open menu/submenu on mousehover
    var $dropdown_toggle = $('.dropdown-envy-toggle,.dropdown-menu');
    $dropdown_toggle.off('mouseenter').on('mouseenter', function () {
        var $this = $(this);

        // wait for some time before opening the menu
        var $menu = $this.parent();
        if (dropdown_timeout) {
            clearTimeout(dropdown_timeout);
        }
        dropdown_timeout = setTimeout(function () {
            // close other open menus
            if ($this.is('.dropdown-envy-toggle')) {
                $('.dropdown.open,.dropdown-submenu.open').removeClass('open');
            }

            $menu.addClass('open');
            select_menu_direction($this.parent());
        }, 10);
    });

    // handle closing menu when hover ends
    $dropdown_toggle.off('mouseleave').on('mouseleave', function () {
        var $menu = $(this).parent();
        if (dropdown_timeout) {
            clearTimeout(dropdown_timeout);
        }
        dropdown_timeout = setTimeout(function () {
            $menu.removeClass('open');
        }, 50);
    });
}

function dropdown_handle_touch() {
    // open menu when touched on touch device
    $('.dropdown-envy-toggle').off('touchend').on('touchend', function (evt) {
        var $this = $(this);
        var $menu = $this.parent();
        if (!$menu.hasClass('open')) {
            evt.preventDefault();
            $menu.find('.dropdown-submenu.open').removeClass('open');
            $menu.addClass('open');
            select_menu_direction($menu);
        }
    });
    // open submenu when touched
    $('.dropdown-submenu').off('touchend').on('touchend', function (evt) {
        var $this = $(this);
        if (!$this.hasClass('open')) {
            evt.preventDefault();
            $('.dropdown-submenu.open').removeClass('open');
            $this.addClass('open');
        }
    });
    // hide menu when touched anywhere else then the menu
    $('body').on('touchstart', function (evt) {
        var $open_menu = $('.dropdown.open');
        if ($open_menu.length === 0) {
            return;
        }
        // don't hide menu if we clicked "inside" the menu
        if ($(evt.target).parents('.dropdown.open').length === 0) {
            $open_menu.removeClass('open');
        }
    });
}

function load_dropdown_hover() {
    dropdown_handle_hover();
    dropdown_handle_touch();
}

function select_menu_direction($menu) {
    // Fix submenu opening outside of viewport by showing it to the left of menu
    var children_widths = $menu.find('.dropdown-menu .dropdown-menu').map(function () {
        var $this = $(this);
        var width = $this.css({'display': 'block', 'visibility': 'hidden'}).outerWidth();
        $this.css({'display': '', 'visibility': ''});
        return width;
    });
    var max_width = Math.max.apply(null, children_widths);
    var $submenu = $menu.find('> .dropdown-menu');
    var left = $submenu.offset().left;
    var right = left + $submenu.outerWidth() + max_width;
    var switch_to_left = right > $('body').width() && left - max_width > 0;
    $submenu.toggleClass('dropdown-submenu-left', switch_to_left);
}

function load_sticky_header() {
    var $sticky = $('.sticky-header-wrapper');
    if ($sticky.length === 0) {
        return;
    }

    var $menu_wrapper = $sticky.find('.sticky-header-menu');
    // copy main menu
    $('#main-navigation-wrapper').clone().appendTo($menu_wrapper);

    // copy menu icons (cart, search, ...)
    $('.cart-link li a').each(function () {
        $('<div class="sticky-header-icon"></div>').append($(this).clone()).appendTo($menu_wrapper);
    });

    // copy search bar
    var $search = $sticky.find('.sticky-header-search')
    $('.top-search').clone().appendTo($search);

    // copy mobile menu
    var $mobile_menu = $('.mobile-header--wrapper').clone().appendTo($sticky.find('.sticky-mobile-header'));
    $mobile_menu.find('.slide-menu-mobile').off('click').on('click', function () {
        $('#menu').trigger('mobile:toggle');
    });

    // How many pixel below the menu should the sticky menu appear
    var menu_breakpoint_offset = 50;

    // breakpoint is where the sticky menu should appear = menu bottom + 50px
    var $menu = $('#shopify-section-header');
    var menu_mobile_breakpoint = $menu.position().top;
    var menu_breakpoint = menu_mobile_breakpoint + $menu.outerHeight(true) + menu_breakpoint_offset;

    function update_sticky_header() {
        var is_sticky;
        var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        if (window.innerWidth < 768) {
            is_sticky = scrollTop > menu_mobile_breakpoint;
        } else {
            is_sticky = scrollTop > menu_breakpoint;
        }
        $sticky.toggleClass('sticky', is_sticky);
    }

    window.addEventListener('scroll', update_sticky_header);
    update_sticky_header();

    // bind cart open to the cart icon
    $sticky.find('.slide-menu-cart').off('click').on('click', function (e) {
        $('#cartSlideoutWrapper').trigger('cart:toggle');
        // prevent non-ajax basket
        e.preventDefault();
        return false;
    });
}

function load_reviews() {
    if (window.hasOwnProperty('SPR') && document.querySelector('#shopify-product-reviews,.shopify-product-reviews-badge')) {
        SPR.registerCallbacks();
        SPR.initRatingHandler();
        SPR.initDomEls();
        SPR.loadProducts();
        SPR.loadBadges();
    }
}

function load_collection_tag_filter() {
    /* Product Tag Filters - Good for any number of filters on any type of collection pages */
    var collFilters = $('.coll-filter');
    collFilters.on('change', function () {
        var newTags = [];
        collFilters.each(function () {
            var val = $(this).val();
            if (val) {
                newTags.push(val);
            }
        });
        if (newTags.length) {
            var query = newTags.join('+');
            window.location.href = $('#link-to-tag-generic a').attr('href').replace(/\/tag($|\?)/, '/' + query + '$1');
        } else {
            window.location.href = $('#link-to-collection').val();
        }
    });
    $('.coll-filter').material_select();
}

function load_collection_sort() {
    Shopify.queryParams = {};
    if (location.search.length) {
        for (var aKeyValue, i = 0, aCouples = location.search.substr(1).split('&'); i < aCouples.length; i++) {
            aKeyValue = aCouples[i].split('=');
            if (aKeyValue.length > 1) {
                Shopify.queryParams[decodeURIComponent(aKeyValue[0])] = decodeURIComponent(aKeyValue[1]);
            }
        }
    }

    var sort_by = $('#collection-sort-by').val();
    $('#sort-by')
        .val(sort_by)
        .on('change', function() {
            Shopify.queryParams.sort_by = $(this).val();
            location.search = $.param(Shopify.queryParams).replace(/\+/g, '%20');
        });
    $('#sort-by').material_select();
}

function load_collection_mobile_sidebar() {
    $('.collection-sidebar--section h2').on('click', function () {
        var $this = $(this);
        var parent = $this.parent();
        parent.toggleClass('expanded');
    });
}

// Video section

var VIDEO_PLAYING = 1, VIDEO_PAUSED = 2, VIDEO_STOPPED = 3;

function is_scrolled_into_view($element) {
    var $w = $(window);
    var docViewTop = $w.scrollTop();
    var docViewBottom = docViewTop + $w.height();

    var elemCenter = $element.offset().top + $element.outerHeight() / 2.0;

    return ((elemCenter >= docViewTop && elemCenter <= docViewBottom));
}

var insideViewCheckTimeout = null, wasInsideView = false;

function visibility_tracker($element, scrolled_into_view_cb, scrolled_out_of_view_cb) {
    wasInsideView = is_scrolled_into_view($element);
    if (wasInsideView) {
        scrolled_into_view_cb();
    }

    $(window).on('scroll', function() {
        check_inside_view($element, scrolled_into_view_cb, scrolled_out_of_view_cb);
    });

    $(window).on('resize', function() {
        check_inside_view($element, scrolled_into_view_cb, scrolled_out_of_view_cb);
    });
    check_inside_view($element, scrolled_into_view_cb, scrolled_out_of_view_cb);
}


function check_inside_view($element, scrolled_into_view_cb, scrolled_out_of_view_cb) {
    if (insideViewCheckTimeout) {
        clearTimeout(insideViewCheckTimeout);
    }
    insideViewCheckTimeout = setTimeout(function () {
        insideViewCheckTimeout = null;

        var isInsideView = is_scrolled_into_view($element);

        if (wasInsideView && !isInsideView) {
            scrolled_out_of_view_cb();
        }

        if (!wasInsideView && isInsideView) {
            scrolled_into_view_cb();
        }
        wasInsideView = isInsideView;
    }, 100);
}

function load_youtube(element) {
    var autoplay = element.dataset.videoAutoplay === "true",
        mute = element.dataset.videoMute === "true",
        loop = element.dataset.videoLoop === "true",
        $element = $(element),
        $parent = $(element).parent(),
        $overlay = $element.closest('.video-section').find('.video-overlay');

    player = new YT.Player(element.id, {
        width: 746,
        videoId: element.dataset.videoLink,
        playerVars: {
            showinfo: 0,
            modestbranding: 1,
            rel: 0
        },
        events: {
            onReady: function (event) {
                var video = event.target;
                if (autoplay) {
                    $parent.data('pausedAutomatically', true);
                }
                if (mute) {
                    video.mute();
                }

                visibility_tracker(
                    $parent,
                    function scrolled_into_view() {
                        if ($parent.data('pausedAutomatically')) {
                            video.playVideo();
                        }
                    },
                    function scrolled_out_of_view() {
                        $overlay.removeClass('active');
                        if (video.getPlayerState() === YT.PlayerState.PLAYING) {
                            $parent.data('pausedAutomatically', true);
                            video.pauseVideo();
                        }
                    }
                )
            },
            onStateChange: function (event) {
                if (event.data === YT.PlayerState.PLAYING) {
                    if (!autoplay) {
                        $overlay.addClass('active');
                    }
                    $parent.data('pausedAutomatically', false);
                }

                if (event.data === YT.PlayerState.ENDED && loop) {
                    event.target.playVideo();
                }
            }
        }
    });
}

function load_youtube_all() {
    $('.youtube-video').each(function (index, el) {
        load_youtube(el);
    });
}

function load_youtube_api() {
   document.addEventListener('startasyncloading', function() {
    if (!document.querySelector('.youtube-video')) {
        // No youtube elements, do not load youtube API
        return;
    }

    if (!document.querySelector('#youtube_api')) {
        // Youtube API is not yet loaded, create script that loads it
        create_script("youtube_api", "https://www.youtube.com/player_api");

        // Call 'youtube_load_all' as soon as the API is loaded
        window.onYouTubePlayerAPIReady = load_youtube_all;
    } else if (!window.YT) {
        // Script for loading youtube API is there, but youtube is not yet loaded,
        // load_youtube_all will be called when script finishes loading
    } else {
        // We already have youtube API loaded, call 'load_youtube_all'
        load_youtube_all();
    }});
}

function load_vimeo(element) {
    var player = new Vimeo.Player(element.id);
    player.ready().catch(function (e) {
        document.getElementById(element.id).innerText = e;
    });
    if (document.querySelector('#' + element.id).dataset.videoMute === "true") {
        player.setVolume(0);
    }
    var autoplay = element.dataset.videoAutoplay === 'true';
    if (autoplay) {
        $(element.parentNode).data('pausedAutomatically', true);
    }

    var $element = $(element),
        $parent = $element.parent(),
        $overlay = $element.closest('.video-section').find('.video-overlay');

    visibility_tracker(
        $parent,
        function scrolled_into_view() {
            if ($parent.data('pausedAutomatically')) {
                player.play();
            }
        },
        function scrolled_out_of_view() {
            $overlay.removeClass('active');
            player.getPaused().then(function (paused) {
                if (!paused) {
                    player.getEnded().then(function (ended) {
                        if (!ended) {
                            $parent.data('pausedAutomatically', true);
                            player.pause();
                        }
                    });
                }
            });
        }
    );
    player.on('play', function(data) {
        if (!autoplay) {
            $overlay.addClass('active');
        }
        $parent.data('pausedAutomatically', false);
    });

}

function load_vimeo_all() {
    $('.vimeo-video').each(function (index, el) {
        load_vimeo(el);
    });
}

function load_vimeo_api() {
    if (!document.querySelector('.vimeo-video')) {
        // No vimeo elements, do not load vimeo API
        return;
    }

    if (!document.querySelector('#vimeo_api')) {
        // Vimeo API is not yet loaded, create script that loads it
        var script = create_script("vimeo_api", "https://player.vimeo.com/api/player.js");

        if (script.readyState) {
            // IE
            script.onreadystatechange = function() {
                if (element.readyState == "loaded" || element.readyState == "complete") {
                    element.onreadystatechange = null;
                    load_vimeo_all();
                }
            };
        } else {
            // Other browsers
            script.onload = function() {
                load_vimeo_all();
            };
        }
    } else if (!window.Vimeo) {
        // Script for loading vimeo API is there, but vimeo is not yet loaded,
        // load_vimeo_all will be called when script finishes loading
    } else {
        // We already have vimeo API loaded, call 'load_vimeo_all'
        load_vimeo_all();
    }
}

function create_script(id, src) {
    var tag = document.createElement('script');
    tag.id = id;
    tag.src = src;
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    return tag;
}

function load_password_recover() {
    var $recover = $('.recover-form');
    if ($recover.length === 0) {
        return;
    }
    $recover.removeClass('no-js');
    if (window.location.hash !== '#recover') {
        $recover.addClass('hide');
    }
    $('.show-password-form').on('click', function (e) {
        $recover.toggleClass('hide');
    });
}

function show_alert($content) {
    $('<div class="page-alert"></div>').append($content.clone()).appendTo('body');
}

function load_newsletter_form() {
    // Use AJAX for submitting the contact form
    $('.contact-form').off('submit').on('submit', function (event) {
        event.preventDefault();
        var $form = $(this);
        $form.find('.newsletter-spinner').removeClass('hide');
        $form.find('#newsletter-wrapper').addClass('hide');

        $.post('/contact', $form.serialize())
            .done(function () {
                $form.find('.form-success').removeClass('hide');
                $form.find('.newsletter-spinner').addClass('hide');
            })
            .fail(function () {
                $form.off('submit');
                $form.submit();
            })
    });
    var $success = $('.contact-form .form-success');
    var $errors = $('.contact-form .errors');
    if ($errors.length > 0 && $errors.children().length > 0) {
        show_alert($errors.eq(0));
    } else if ($success.length > 0) {
        show_alert($success.eq(0));
    }

}

// Initialization

function block_select(event) {
    // Stop animation and show block when selected in the Slideshow section
    var slider = sliders[event.detail.sectionId];
    if (slider) {
        var index = parseInt(event.target.dataset.slideIndex);
        slider.show_slide(index);
    }

    var testimonial = testimonials[event.detail.sectionId];
    if (testimonial) {
        var index = parseInt(event.target.dataset.slideIndex);
        testimonial.show_slide(index);
    }

    // Stop animation and show block when select in Text Adverts section on mobile
    var mobile_text_advert = $(event.target).parents('.homepage-sections-wrapper').find('.mobile-homepage-text-adverts');
    if (mobile_text_advert.length > 0) {
        var index = Array.prototype.indexOf.call(event.target.parentElement.children, event.target);
        mobile_text_advert.flexslider("stop");
        mobile_text_advert.flexslider(index);
    }

    // Open megamenu which is being edited (both normal menu and sticky menu)
    if (event.target.dataset.megaMenuBlockId) {
        $('[data-mega-menu-block-id=' + event.target.dataset.megaMenuBlockId + ']').closest('li.dropdown').addClass('force-open');
    }
}

function block_deselect(event) {
    // Resume animation when block is deselected in the Slideshow section
    var slider = sliders[event.detail.sectionId];
    if (slider) {
        slider.start_animation();
    }

    var testimonial = testimonials[event.detail.sectionId];
    if (testimonial) {
        testimonial.start_animation();
    }

    // Resume animation when block is deselected in Text Adverts section on mobile
    var mobile_text_advert = $(event.target).parents('.homepage-sections-wrapper').find('.mobile-homepage-text-adverts');
    if (mobile_text_advert.length > 0) {
        mobile_text_advert.flexslider("play");
    }

    // Close opened megamenus
    $('li.dropdown.force-open').removeClass('force-open');
}

function get_section_name(event) {
    var section = null;
    if (event && event.detail) {
        var data = {};
        var dataset = event.target.dataset;
        for (var key in dataset) {
            if (dataset.hasOwnProperty(key) && (key.indexOf('themeEditorSection-') === 0 || key.indexOf('shopifyEditorSection') === 0)) {
                data = JSON.parse(dataset[key]);
            }
        }
        if (data.hasOwnProperty('type')) {
            section = data['type'];
        }
    }
    return section;
}

function onload(event) {
    // Init Feather Icon Lib
    load_icons();

    document.addEventListener('shopify:block:select', block_select);
    document.addEventListener('shopify:block:deselect', block_deselect);

    var section = get_section_name(event);
    if (!section || section === 'testimonials') {
        // Do not reload slider when header or footer is changed
        load_testimonial(event && event.target);
    }

    if (!section || section === 'slideshow') {
        // Do not reload slider when header or footer is changed
        load_slider(event && event.target);
    }

    if (!section || section === 'instagram') {
        load_instagram(event.target);
    }

    if (!section || section === 'product-template' || section === 'indiv-product') {
        load_zoom();
        load_tabs();
        load_mobile_product_slider();
        load_indiv_product_slider();
        load_quantity_controls();
        load_out_of_stock_email_form();
        load_product(section && event && event.target);
        load_materialize_select();
    }

    if (!section || section === 'product-recommendations') {
        load_product_recommendations();
    }

    if (!section || section === 'header') {
        load_search();
        load_sticky_header();
        load_mobile_menu();
        load_dropdown_hover();
    }

    if (!section || section === 'text-adverts') {
        load_mobile_text_adverts();
    }

    if (!section || section === 'text-over-image' || section === 'image') {
          load_parallax();
    }

    if (!section || section === 'collection-template') {
        load_collection_tag_filter();
        load_collection_sort();
        load_collection_mobile_sidebar();
    }

    if (!section || section === 'list-collections' || section === 'collection' || section === 'collection-template' || section === 'product-template' || section === 'indiv-product') {
        if (event) {
            // The Shopify Product Review app will load itself on document load,
            // we need to apply it manually when product section change
            load_reviews();
        }
    }

    if (!section || section === 'cart-template') {
        load_quantity_controls();
        load_terms_check();
    }
    if (!section || section === 'video') {
        load_youtube_api();
        load_vimeo_api();
    }
    if (!section) {
        load_password_recover();
    }
    load_newsletter_form();
    load_cart_drawer();
}

function onunload() {
    document.removeEventListener('shopify:block:select', block_select);
    document.removeEventListener('shopify:block:deselect', block_deselect);
    sliders = {};
}

document.addEventListener('shopify:section:load', onload);
document.addEventListener('shopify:section:unload', onunload);
document.addEventListener("DOMContentLoaded", onload);


function makeVideoEmbedsResponsive(){

    $('.template-page iframe, .template-blog iframe, .template-article iframe').each(function(index, iframe){

        var source = $(iframe).attr("src");

        if (source.indexOf("youtube.com") >= 0 || source.indexOf("vimeo.com") >= 0 || source.indexOf("dailymotion.com") >= 0){

            //create container
            var embedContainer = document.createElement('div');
            $(embedContainer).addClass('embed-container');

            //clone iframe
            var iframeClone = $(iframe).clone();

            //put clone in container
            $(embedContainer).append(iframeClone);

            //embed clone with responsive container
            $(iframe).replaceWith(embedContainer);

        }

    });

}

function load_out_of_stock_email_form(){

    $('#notify-me a').on('click', function() {
        if ($("customer_notify").val() == '0'){
            $('#sold-out form').submit();
        }
        else {
            $('#notify-me-wrapper').fadeIn();
        }
        return false;
    });

    $(document).on("variantUnavailable", function(evt){

        if($('.product-page--submit-action').data('stock-email-enabled')){

            var productTitle = $('.product-description-header').text();
            var $outOfStockEmailBody = $('#notify-me-wrapper input[name="contact[body]"]');
            var $emailString = "Please notify me when "+productTitle+", variant: "+evt.variant.title+" becomes available."
            $outOfStockEmailBody.val($emailString);
            $(".variant-out-of-stock").fadeIn();
            $(".product-page--submit-action").addClass("hidden");
        }
    });

    $(document).on("variantAvailable", function(){
        if($('.product-page--submit-action').data('stock-email-enabled')) {
            $(".variant-out-of-stock").hide();
            $(".product-page--submit-action").removeClass("hidden");
        }
    });

}

function load_materialize_select(){
    $('select.materialize').material_select();
}

function load_quantity_controls(){

    $('.quantity-controls button.qty-plus').off().on('click', function(e){
        e.preventDefault();
        var qtyInput = $(this).closest('.quantity-controls').find('input.quantity-selector');
        qtyInput.val(parseInt(qtyInput.val()) + 1);
    });

    $('.quantity-controls button.qty-minus').off().on('click', function(e){
        e.preventDefault();
        var qtyInput = $(this).closest('.quantity-controls').find('input.quantity-selector');
        var newQty = (parseInt(qtyInput.val()) - 1 < 1) ? 1 : qtyInput.val() - 1;
        qtyInput.val(newQty);
    });

}

function load_terms_check() {
    var selector = '[name="checkout"], [name="goto_pp"], [name="goto_gc"]';
    $('body').off('click', selector, check_terms).on('click', selector, check_terms);
}

function check_terms() {
    var $this = $(this);
    var $form = $this.closest('form');
    var $agree = $form.find('#agree');
    if ($agree.length === 0 || $agree.is(':checked')) {
        $this.submit();
    } else {
        alert("You must agree with the terms and conditions of sales to check out.");
        $form.find('.cart-button-checkout-text').removeClass('hide');
        $form.find('.cart-button-checkout-spinner').addClass('hide');
        return false;
    }
}

$(document).ready(function() {

    makeVideoEmbedsResponsive();

    load_materialize_select();

    load_out_of_stock_email_form();

    load_quantity_controls();

});

})(window.wetheme.$);
