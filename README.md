Webpack Preprocessor
===================

Webpack plugin for preprocessor support

This project is my first attempt at making a webpack loader and is based on the webpack-strip-block project by jballant
<a href="https://github.com/jballant/webpack-strip-block">webpack-strip-block</a>

###Example:

```javascript
funcion foo() {
    /*#if dev*/
    let bar = 'dev';
    /*#elif stage&&test*/
    let bar = 'stage-test';
    /*#elif stage||test*/
    let bar = 'stage-or-test';
    /*#else*/
    let bar = 'prod';
    /*#endif*/

    /*#if !dev*/
    bar += '!dev';
    /*#endif*/
    
    /*#if cond1&&cond2||cond3 */ // <-- combinations of && and || operators are not supported
    /*#endif*/

    console.log(bar);
}
```

``` html
<!--#if dev||stage-->
<div>DEVELOPMENT VERSION</div>
<!--#endif-->
```

webpack.config:

```javascript
{
    module: {
        loaders: [
            { test: /\.(js|htm(l?))$/, loader: "webpack-preprocessor?definitions=['stage,test']" }
        ]
    }
};
```
