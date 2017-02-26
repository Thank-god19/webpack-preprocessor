Webpack Preprocessor
===================

Webpack plugin for preprocessor support

This project is based on the webpack-strip-block project by jballant
<a href="https://github.com/jballant/webpack-strip-block">webpack-strip-block</a>

###Example:

```javascript
var foo() {
    /*#if dev*/
    let bar = 'dev';
    /*#else*/
    let bar = 'prod';
    /*#endif*/

    console.log(bar);
}
```

webpack.config:

```javascript
{
    module: {
        loaders: [
            { test: /\.js$/, loader: "webpack-preprocessor?definitions=['dev']" }
        ]
    }
};
```