'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var fs = require('fs');
var crypto = require('crypto');
var _ = require('lodash');
var jsonFile = require('json-file-plus');
var path = require('path'); // in node-core
var composerFilePath = path.join(process.cwd(), 'composer.json');
var request = require('request');
var exec = require('child_process').exec;

module.exports = yeoman.generators.Base.extend({
    constructor: function () {
        yeoman.generators.Base.apply(this, arguments);
    },

    initializing: {
        checkIfEmptyFolder: function () {
            var filesInFolder = fs.readdirSync('.');

            if (filesInFolder.length !== 0) {
                this.log.error('the folder is not empty');
                this.env.error("exiting");
            }
        },

        checkIfWpIsInstalled: function () {
            var done = this.async();
            var _this = this;

            var child = exec('which wp');

            var exist = false;

            child.stdout.on('data', function () {
                exist = true;
            });

            child.on('close', function () {
                if (exist) {
                    done();
                } else {
                    _this.log.error('WPCLI is not installed.');
                    _this.env.error("exiting");
                }
            });
        },

        checkIfComposerIsInstalled: function () {
            var done = this.async();
            var _this = this;

            var child = exec('which composer');

            var exist = false;

            child.stdout.on('data', function () {
                exist = true;
            });

            child.on('close', function () {
                if (exist) {
                    done();
                } else {
                    _this.log.error('Composer is not installed.');
                    _this.env.error("exiting");
                }
            });
        }
    },

    prompting: function () {
        var done = this.async();

        // Have Yeoman greet the user.
        this.log(yosay(
            'Welcome to the ' + chalk.red('Stash') + ' generator!'
        ));

        var prompts = [
            {
                type: 'input',
                name: 'DB_NAME',
                message: 'Enter Database name',
                default: 'stash_wp'
            },
            {
                type: 'input',
                name: 'DB_USER',
                message: 'Enter Database user',
                default: 'root'
            },
            {
                type: 'input',
                name: 'DB_PASSWORD',
                message: 'Enter Database password',
                default: 'root'
            },
            {
                type: 'input',
                name: 'DB_HOST',
                message: 'Enter Database host',
                default: 'localhost'
            },
            {
                type: 'input',
                name: 'WP_ENV',
                message: 'Enter env',
                default: 'development'
            },
            {
                type: 'input',
                name: 'WP_URL',
                message: 'Enter wordpress home url (no http://)',
                default: 'dev.stash.io'
            },
            {
                type: 'input',
                name: 'SITE_TITLE',
                message: 'Enter the title of the website',
                default: 'Stash'
            },
            {
                type: 'input',
                name: 'ADMIN_USERNAME',
                message: 'Enter admin username',
                default: 'dominator'
            },
            {
                type: 'input',
                name: 'ADMIN_PW',
                message: 'Enter admin password',
                default: crypto.randomBytes(8).toString('hex')
            },
            {
                type: 'input',
                name: 'ADMIN_EMAIL',
                message: 'Enter admin email',
                default: 'wp@unde.fined.io'
            },
            {
                type: 'confirm',
                name: 'PLUGIN_POLYLANG',
                message: 'Do you want to install polylang?',
                default: false
            },
            {
                type: 'confirm',
                name: 'PLUGIN_NINJAFORMS',
                message: 'Do you want to install ninjaforms?',
                default: false
            },
            {
                type: 'confirm',
                name: 'PLUGIN_YOAST',
                message: 'Do you want to install yoast?',
                default: false
            },
            {
                type: 'confirm',
                name: 'PLUGIN_WORDFENCE',
                message: 'Do you want to install wordfence?',
                default: false
            },
            {
                type: 'confirm',
                name: 'PLUGIN_DEBUG',
                message: 'Do you want to install debug plugins? (only for dev machine)',
                default: false
            },
            {
                type: 'input',
                name: 'PLUGIN_ACF_PRO',
                message: 'Do you want to use advanced custom fields? if yes input your API key.',
                default: ''
            }
        ];

        this.prompt(prompts, function (props) {
            this.props = props;
            done();
        }.bind(this));
    },

    configuring: {
        checkAcfCode: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_ACF_PRO.length === 0) {
                done();
            } else {
                request('http://connect.advancedcustomfields.com/index.php?p=pro&a=download&k=' + _this.props.PLUGIN_ACF_PRO,
                    function (error, response, body) {
                        if (response.statusCode === 200) {
                            done();
                        } else {
                            _this.log.error('Your ACF pro key is not correct');
                            _this.env.error("exiting");
                        }
                    });
            }
        },

        git: function () {
            var done = this.async();
            var _this = this;

            this.spawnCommand('git', ['clone', 'https://github.com/undefinedio/stash', 'tmp'])
                .on('close', function () {
                    _this.spawnCommand('cp', ['-R', 'tmp/', '.'])
                        .on('close', function () {
                            _this.spawnCommand('rm', ['-rf', 'tmp', '.git'])
                                .on('close', function () {
                                    done();
                                });
                        });
                });
        },

        addAcf: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_ACF_PRO.length === 0) {
                done();
            } else {
                var host = "connect.advancedcustomfields.com",
                    path = "index.php?p=pro&a=download&k=" + _this.props.PLUGIN_ACF_PRO;

                jsonFile(composerFilePath, function (err, file) {
                    file.set({
                        "repositories": {
                            "packagist": {
                                "type": "composer",
                                "url": "http://wpackagist.org"
                            },
                            "acf": {
                                "type": "package",
                                "package": {
                                    "name": "advanced-custom-fields/advanced-custom-fields-pro",
                                    "version": "5.3",
                                    "type": "wordpress-plugin",
                                    "dist": {
                                        "type": "zip",
                                        "url": "http://" + host + "/" + path
                                    }
                                }
                            }
                        }
                    });

                    file.save().then(function () {
                        done();
                    }).catch(function (err) {
                        _this.log.error('writing composer.json didn\'t succeed', err);
                        _this.env.error("exiting");
                    });
                });
            }
        },

        composer: function () {
            var done = this.async();
            var _this = this;
            this.spawnCommand('composer', ['install'])
                .on('close', function () {
                    done();
                });
        }
    },

    writing: {
        env: function () {
            var done = this.async();
            var _this = this;

            fs.readFile('.env.example', 'utf8', function (err, data) {
                if (err) {
                    this.log.error('reading file .env.example didn\'t succeed');
                    this.env.error("exiting");
                }

                data = data.replace(/DB_NAME=wp_example/g, 'DB_NAME=' + _this.props.DB_NAME);
                data = data.replace(/DB_USER=root/g, 'DB_USER=' + _this.props.DB_USER);
                data = data.replace(/DB_PASSWORD=root/g, 'DB_PASSWORD=' + _this.props.DB_PASSWORD);
                data = data.replace(/DB_HOST=localhost/g, 'DB_HOST=' + _this.props.DB_HOST);
                data = data.replace(/WP_ENV=development/g, 'WP_ENV=' + _this.props.WP_ENV);
                data = data.replace(/WP_HOME=http:\/\/example\.com/g, 'WP_HOME=http://' + _this.props.WP_URL);
                data = data.replace(/WP_SITEURL=http:\/\/example\.com\/wp/g, 'WP_SITEURL=http://' + _this.props.WP_HOME + '/wp');

                fs.writeFile('.env', data, 'utf8', function (err) {
                    if (err) {
                        _this.log.error('writing .env file didn\'t succeed');
                        _this.env.error("exiting");
                    } else {
                        _this.log('done writing env');
                        done();
                    }
                });
            });
        },

        wpcli: function () {
            var done = this.async();
            var _this = this;

            var args = [
                'core',
                'install',
                '--url=' + _this.props.WP_URL,
                '--title=\'' + _this.props.SITE_TITLE + '\'',
                '--admin_user=\'' + _this.props.ADMIN_USERNAME + '\'',
                '--admin_password=' + _this.props.ADMIN_PW,
                '--admin_email=' + _this.props.ADMIN_EMAIL
            ];

            this.spawnCommand('wp', args)
                .on('close', function (err) {
                    if (!err) {
                        done();
                    } else {
                        _this.log.error('wordpress install failed (check DB credentials and see if its empty)');
                        _this.env.error("exiting");
                    }
                });
        },

        polylang: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_POLYLANG) {
                this.spawnCommand('composer', ['require', 'wpackagist-plugin/polylang'])
                    .on('close', function () {
                        done();
                    })
            } else {
                done();
            }
        },

        ninjaforms: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_NINJAFORMS) {
                this.spawnCommand('composer', ['require', 'wpackagist-plugin/ninja-forms'])
                    .on('close', function () {
                        done();
                    })
            } else {
                done();
            }
        },

        yoast: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_YOAST) {
                this.spawnCommand('composer', ['require', 'wpackagist-plugin/wordpress-seo'])
                    .on('close', function () {
                        done();
                    })
            } else {
                done();
            }
        },

        wordfence: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_WORDFENCE) {
                this.spawnCommand('composer', ['require', 'wpackagist-plugin/wordfence'])
                    .on('close', function () {
                        done();
                    })
            } else {
                done();
            }
        },

        ACF: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_ACF_PRO.length !== 0) {
                this.spawnCommand('composer', ['require', 'advanced-custom-fields/advanced-custom-fields-pro'])
                    .on('close', function () {
                        done();
                    })
            } else {
                done();
            }
        },

        DEBUG: function () {
            var done = this.async();
            var _this = this;

            if (this.props.PLUGIN_DEBUG) {
                this.spawnCommand('composer', ['wpackagist-plugin/debug-bar', 'wpackagist-plugin/debug-bar-cron', 'wpackagist-plugin/debug-bar-actions-and-filters-addon', 'wpackagist-plugin/debug-bar-timber', '-dev'])
                    .on('close', function () {
                        done();
                    })
            } else {
                done();
            }
        },

        plugins: function () {
            var done = this.async();
            var _this = this;

            this.spawnCommand('wp', ['plugin', 'activate', '--all'])
                .on('close', function () {
                    done();
                });
        },

        theme: function () {
            var done = this.async();
            var _this = this;

            this.spawnCommand('wp', ['theme', 'activate', 'stash'])
                .on('close', function () {
                    done();
                });
        },

        permalinks: function () {
            var done = this.async();
            var _this = this;

            this.spawnCommand('wp', ['rewrite', 'structure', '/%postname%/', '--hard'])
                .on('close', function () {
                    done();
                });
        }
    },

    install: {
        bowerAndNpm: function () {
            this.installDependencies();
        }
    },

    end: function () {
        this.log('Nice! now just run gulp!');
    }
});
