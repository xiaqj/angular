/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const path = require('path');
const Package = require('dgeni').Package;

const jsdocPackage = require('dgeni-packages/jsdoc');
const nunjucksPackage = require('dgeni-packages/nunjucks');
const linksPackage = require('../links-package');
const examplesPackage = require('../examples-package');
const targetPackage = require('../target-package');
const remarkPackage = require('../remark-package');

const { PROJECT_ROOT, DOCS_OUTPUT_PATH, TEMPLATES_PATH, requireFolder } = require('../config');

module.exports = new Package('angular-base', [
  jsdocPackage, nunjucksPackage, linksPackage, examplesPackage, targetPackage, remarkPackage
])

  // Register the processors
  .processor(require('./processors/generateKeywords'))
  .processor(require('./processors/createOverviewDump'))
  .processor(require('./processors/checkUnbalancedBackTicks'))
  .processor(require('./processors/convertToJson'))
  .processor(require('./processors/fixInternalDocumentLinks'))

  // overrides base packageInfo and returns the one for the 'angular/angular' repo.
  .factory('packageInfo', function() { return require(path.resolve(PROJECT_ROOT, 'package.json')); })
  .factory(require('./readers/json'))

  .config(function(checkAnchorLinksProcessor) {
    // TODO: re-enable
    checkAnchorLinksProcessor.$enabled = false;
  })

  // Where do we get the source files?
  .config(function(readFilesProcessor, collectExamples, generateKeywordsProcessor, jsonFileReader) {

    readFilesProcessor.fileReaders.push(jsonFileReader);
    readFilesProcessor.basePath = PROJECT_ROOT;
    readFilesProcessor.sourceFiles = [];
    collectExamples.exampleFolders = [];

    generateKeywordsProcessor.ignoreWordsFile = path.resolve(__dirname, 'ignore.words');
    generateKeywordsProcessor.docTypesToIgnore = ['example-region'];
  })

  // Where do we write the output files?
  .config(function(writeFilesProcessor) { writeFilesProcessor.outputFolder = DOCS_OUTPUT_PATH; })


  // Target environments
  .config(function(targetEnvironments) {
    const ALLOWED_LANGUAGES = ['ts', 'js', 'dart'];
    const TARGET_LANGUAGE = 'ts';

    ALLOWED_LANGUAGES.forEach(target => targetEnvironments.addAllowed(target));
    targetEnvironments.activate(TARGET_LANGUAGE);
  })


  // Configure nunjucks rendering of docs via templates
  .config(function(
      renderDocsProcessor, templateFinder, templateEngine, getInjectables) {

    // Where to find the templates for the doc rendering
    templateFinder.templateFolders = [TEMPLATES_PATH];

    // Standard patterns for matching docs to templates
    templateFinder.templatePatterns = [
      '${ doc.template }', '${ doc.id }.${ doc.docType }.template.html',
      '${ doc.id }.template.html', '${ doc.docType }.template.html',
      '${ doc.id }.${ doc.docType }.template.js', '${ doc.id }.template.js',
      '${ doc.docType }.template.js', '${ doc.id }.${ doc.docType }.template.json',
      '${ doc.id }.template.json', '${ doc.docType }.template.json', 'common.template.html'
    ];

    // Nunjucks and Angular conflict in their template bindings so change Nunjucks
    templateEngine.config.tags = {variableStart: '{$', variableEnd: '$}'};

    templateEngine.filters =
        templateEngine.filters.concat(getInjectables(requireFolder(__dirname, './rendering')));

    // helpers are made available to the nunjucks templates
    renderDocsProcessor.helpers.relativePath = function(from, to) {
      return path.relative(from, to);
    };
  })



  // We are not going to be relaxed about ambiguous links
  .config(function(getLinkInfo) {
    getLinkInfo.useFirstAmbiguousLink = false;
  })



  .config(function(computePathsProcessor, generateKeywordsProcessor) {

    generateKeywordsProcessor.outputFolder = 'app';

    // Replace any path templates inherited from other packages
    // (we want full and transparent control)
    computePathsProcessor.pathTemplates = [
      {docTypes: ['example-region'], getOutputPath: function() {}},
    ];
  })

  .config(function(convertToJsonProcessor) {
    convertToJsonProcessor.docTypes = [];
  });
