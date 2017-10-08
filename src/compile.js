'use strict';

var _ = require('lodash');
var $ = require('jquery');

function $CompileProvider($provide) {

    var hasDirectives = {};

    this.directive = function (name, directiveFactory) {
        if (_.isString(name)) {
            if (name === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid directive name';
            }
            if (!hasDirectives.hasOwnProperty(name)) {
                hasDirectives[name] = [];
                $provide.factory(name + 'Directive', ['$injector', function ($injector) {
                    var factories = hasDirectives[name];
                    return _.map(factories, $injector.invoke);
                }]);
            }
            hasDirectives[name].push(directiveFactory);
        } else {
            _.forEach(name, _.bind(function (directiveFactory, name) {
                this.directive(name, directiveFactory);
            }, this));
        }
    };

    this.$get = ['$injector', function ($injector) {

        function compile($compileNodes) {
            return compileNodes($compileNodes);
        }

        function compileNodes($compileNodes) {
            _.forEach($compileNodes, function (node) {
                var directives = collectDirectives(node);
                applyDirectivesToNode(directives, node);
                if (node.childNodes && node.childNodes.length) {
                    compileNodes(node.childNodes);
                }
            });
        }

        function collectDirectives(node) {
            var directives = [];
            if (node.nodeType === Node.ELEMENT_NODE) {
                var normalizedNodeName = directiveNormalize(nodeName(node).toLowerCase());
                addDirective(directives, normalizedNodeName);
                _.forEach(node.attributes, function (attr) {
                    var normalizedAttrName = directiveNormalize(attr.name.toLowerCase());
                    if (/^ngAttr[A-Z]/.test(normalizedAttrName)) {
                        normalizedAttrName =
                            normalizedAttrName[6].toLowerCase() +
                            normalizedAttrName.substring(7);
                    }
                    addDirective(directives, normalizedAttrName);
                });
                _.forEach(node.classList, function (cls) {
                    var normalizedClassName = directiveNormalize(cls);
                    addDirective(directives, normalizedClassName);
                });
            } else if (node.nodeType === Node.COMMENT_NODE) {
                var match = /^\s*directive\:\s*([\d\w\-_]+)/.exec(node.nodeValue);
                if (match) {
                    addDirective(directives, directiveNormalize(match[1]));
                }
            }
            return directives;
        }

        function nodeName(element) {
            return element.nodeName ? element.nodeName : element[0].nodeName;
        }

        function addDirective(directives, name) {
            if (hasDirectives.hasOwnProperty(name)) {
                directives.push.apply(directives, $injector.get(name + 'Directive'));
            }
        }

        function applyDirectivesToNode(directives, compileNode) {
            var $compileNode = $(compileNode);
            _.forEach(directives, function (directive) {
                if (directive.compile) {
                    directive.compile($compileNode);
                }
            });
        }

        return compile;

    }];

}

$CompileProvider.$inject = ['$provide'];


var PREFIX_REGEXP = /(x[\:\-_]|data[\:\-_])/i;

function directiveNormalize(name) {
    return _.camelCase(name.replace(PREFIX_REGEXP, ''));
}

module.exports = $CompileProvider;