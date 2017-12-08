define([
    'jquery', './Translater', 'sweetalert', 'app-config'
], function($, translater, sweetalert, AppConfig) {
    var translater = translater.getTranslater();

    // fix swal lib breaking tab key
    // https://github.com/t4t5/sweetalert/issues/127
    var close = window.swal.close;
    window.swal.close = function() {
        close();
        window.onkeydown = null;
    };

    return {
        /**
         * inlineSvg replaces svg image tags matching selector with inline svg (for css edition)
         * source: https://stackoverflow.com/questions/24933430/img-src-svg-changing-the-fill-color#answer-24933495
         */
        inlineSvg: function(selector) {
            $(selector).each(function () {
                var $img = $(this);
                var imgID = $img.attr('id');
                var imgClass = $img.attr('class');
                var imgURL = $img.attr('src');

                $.get(imgURL, function (data) {
                    // Get the SVG tag, ignore the rest
                    var $svg = $(data).find('svg');

                    // Add replaced image's ID to the new SVG
                    if (typeof imgID !== 'undefined') {
                        $svg = $svg.attr('id', imgID);
                    }
                    // Add replaced image's classes to the new SVG
                    if (typeof imgClass !== 'undefined') {
                        $svg = $svg.attr('class', imgClass + ' replaced-svg');
                    }

                    // Remove any invalid XML tags as per http://validator.w3.org
                    $svg = $svg.removeAttr('xmlns:a');

                    // Check if the viewport is set, if the viewport is not set the SVG wont't scale.
                    if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
                        $svg.attr('viewBox', '0 0 ' + $svg.attr('height') + ' ' + $svg.attr('width'))
                    }

                    // Replace image with new SVG
                    $img.replaceWith($svg);
                }, 'xml');
            });
        },

        /**
         * dedupeFilename appends now timestamp to filename before extension
         */
        dedupeFilename: function(name) {
            return this.appendFilenameSuffix(name, "_" + Date.now());
        },

        /**
         * appendFilenameSuffix inserts suffix before extension, if available, or just
         * at the end of name if no extension detected.
         */
        appendFilenameSuffix: function(name, suffix) {
            if (name.indexOf(".") == -1) {
                return name + suffix;
            }
            return name.replace(/(\.[\w\d_-]+)$/i, '' + suffix + '$1');
        },

        /**
         * appendRequired appends <span>*</span> for each schema entry if
         * it has "required" validator.
         */
        appendRequired: function($el, schema) {
            $.each(schema, function(index, value){
                if (!value.validators) return;
                for (var i in value.validators) {
                    var validator = value.validators[i];
                    if (validator == "required" || validator.type === "required") {
                        $el.find(".field-" + index + " label[for]").append("<span>*</span>");
                    }
                }
            });
        },

        /**
         * binWeight exposes two functions for transposing a 4bits binary weight into
         * custom dict {visible, editable, nullable, nullmean}. And vice-versa!
         */
        binWeight: {
            items: [
                "visible", "editable", "nullable", "nullmean"
            ],
            toValue: function(dict) {
                var i = 0;
                i += dict.visible ? 1: 0;
                i += dict.editable ? 2: 0;
                i += dict.nullable ? 4: 0;
                i += dict.nullmean ? 8: 0;
                return i;
            },
            toDict: function(value) {
                var dict = {};
                dict.nullmean = (value >= 8);
                value %= 8;
                dict.nullable = (value >= 4);
                value %= 4;
                dict.editable = (value >= 2);
                value %= 2;
                dict.visible = (value >= 1);
                return dict;
            }
        },

        swalSelect: function(t, title, text, selectLabel, selectOptions, options, confirmCallback) {
            var $el = $("<div class='swalSelect'>");
            $el.append("<p class='important'>" + translater.getValueFromKey(text) + "</p>");
            $el.append("<label for='swalSelect'>" + translater.getValueFromKey(selectLabel) + "</label>");

            // populate select options
            var $select = $("<select id='swalSelect'>");
            for (var i in selectOptions) {
                $select.append(
                    "<option value='" + selectOptions[i] + "'>" +
                    translater.getValueFromKey("fields." + selectOptions[i].toLowerCase()) +
                    "</option>");
            }
            $el.append($select);
            options.html = true;
            this.swal(t, title, $el[0].outerHTML, options, null,
                function() {
                    confirmCallback($("#swalSelect").val());
                }
            );
        },

        swal: function(t, title, text, options, callback, confirmCallback) {
            var opts = $.extend({
                type: t,
                title: translater.getValueFromKey(title),
                text: translater.getValueFromKey(text),
                closeOnConfirm: true,
                closeOnCancel: true
            }, options);

            if (opts.cancelButtonText) opts.showCancelButton = true;

            sweetalert(opts, function(confirm) {
                if (callback && typeof(callback) === 'function') {
                    callback();
                }
                if (confirm && confirmCallback && typeof(confirmCallback) === 'function') {
                    confirmCallback();
                }
            });
        },

        getContextConfig: function(context, key) {
            if (!AppConfig.contexts[context]) return null;

            var item = AppConfig.contexts[context][key];
            if (item) return item;

            return AppConfig.defaults[key];
        },

        $findInCollection: function(collection, selector) {
            var $result = $();
            _.each(collection, function(e) {
                var $el = $(e).find(selector);
                if ($el.length > 0)
                    $result.push.apply($result, $el);
            });
            return $result;
        },

        // loadTree is a caching thing that would need to embrace callback &
        // promises & fancy stuff but won't cause time.
        loadTree: function(url, sync) {
            if (!this.trees) this.trees = {};

            if (!this.trees[url]) {
                this.trees[url] = {};
            }

            var tree = this.trees[url];
            if (tree.data || tree.loading) {
                return tree;
            }
            tree.loading = true;

            var ajaxOpts = {
                type        : 'POST',
                url         : url,
                contentType : 'application/json',
                data        : JSON.stringify({StartNodeID:0, deprecated:0, lng:"Fr"}),
                timeout     : 20000,
                success: _.bind(function (data) {
                    tree.data = data;
                    tree.loading = false;
                    tree.error = undefined;
                }, this),
                error: function (xhr) {
                    console.warn("error loading tree \"" + url + "\": ", xhr);
                    tree.loading = false;
                    tree.error = xhr;
                }
            };
            if (sync === true) {
                ajaxOpts.async = false;
            }
            $.ajax(ajaxOpts);
            return tree;
        },

        getTree: function(url, sync) {
            var tree = this.trees[url];
            if (tree && tree.data) {
                return tree;
            }

            if (tree && tree.loading) {
                console.warn("tree is still loading, call back later");
                return tree;
            }

            if (tree && !tree.loading) {
                console.info("loading tree for", url, "this might take a while");
                return this.loadTree(url);
            }

            return this.loadTree(url, sync);
        }
    };
});
