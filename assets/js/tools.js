define(['jquery', './Translater', 'sweetalert'], function($, translater, sweetalert) {
    var translater = translater.getTranslater();
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
         * binWeight exposes two functions for transposing a 4bits binary weight into
         * custom dict {visible, editable, nullable, nullmean}. And vice-versa!
         */
        binWeight: {
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

        swal: function(t, title, text, options, callback, confirmCallback) {
            var opts = $.extend({
                type: t,
                title: translater.getValueFromKey(title),
                text: translater.getValueFromKey(text),
                closeOnConfirm: true,
                closeOnCancel: true
            }, options);

            sweetalert(opts, function(confirm) {
                window.onkeydown = null;
                window.onfocus = null;
                if (callback && typeof(callback) === 'function') {
                    callback();
                }
                if (confirm && confirmCallback && typeof(confirmCallback) === 'function') {
                    confirmCallback();
                }
            });
        }
    };
});
