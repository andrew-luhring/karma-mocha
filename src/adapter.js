var formatError = function(error) {
  var stack = error.stack;
  var message = error.message;

  if (stack) {
    var firstLine = stack.substring(0, stack.indexOf('\n'));
    if (message && firstLine.indexOf(message) === -1) {
      stack = message + '\n' + stack;
    }

    // remove mocha stack entries
    return stack.replace(/\n.+\/adapter(\/lib)?\/mocha.js\?\d*\:.+(?=(\n|$))/g, '');
  }

  return message;
};


var createMochaReporterConstructor = function(tc) {

  // TODO(vojta): error formatting
  return function(runner) {
    // runner events
    // - start
    // - end
    // - suite
    // - suite end
    // - test
    // - test end
    // - pass
    // - fail

    runner.on('start', function() {
      tc.info({total: runner.total});
    });

    runner.on('end', function() {
      tc.complete({
        coverage: window.__coverage__
      });
    });

    runner.on('test', function(test) {
      test.$errors = [];
    });

    runner.on('fail', function(test, error) {
      if ('hook' === test.type || error.uncaught) {
        test.$errors = [formatError(error)];
        runner.emit('test end', test);
      } else {
        test.$errors.push(formatError(error));
      }
    });

    runner.on('test end', function(test) {
      var skipped = test.pending === true;

      var result = {
        id: '',
        description: test.title,
        suite: [],
        success: test.state === 'passed',
        skipped: skipped,
        time: skipped ? 0 : test.duration,
        log: test.$errors || []
      };

      var pointer = test.parent;
      while (!pointer.root) {
        result.suite.unshift(pointer.title);
        pointer = pointer.parent;
      }

      tc.result(result);
    });
  };
};


var createMochaStartFn = function(mocha) {
  return function(config) {
    if(config && config.args && config.args.grep){
      mocha.grep(config.args.grep);
    }
    mocha.run();
  };
};


var defaultConfig = {
  reporter: createMochaReporterConstructor(window.__karma__),
  ui: 'bdd',
  globals: ['__cov*']
};

// Pass options from client.mocha to mocha
var createConfigObject = function(karma) {
  if (!karma.config || !karma.config.mocha) {
    return defaultConfig;
  }

  var passedIn = karma.config.mocha;

  // Overwrite reporter because otherwise everything breaks down.
  passedIn.reporter = defaultConfig.reporter;

  // Default to bdd ui
  passedIn.ui = passedIn.ui || defaultConfig.ui;

  // Add our gobals
  if (passedIn.globals && typeof passedIn.globals.concat === 'function') {
    // Array
    passedIn.globals.concat(defaultConfig.globals);
  } else {
    passedIn.globals = defaultConfig.globals;
  }
  return passedIn;
};

