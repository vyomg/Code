/* ========================= */
/* AERVEX - script.js */
/* ========================= */

/* ========================= */
/* NAVBAR BACKGROUND EFFECT */
/* ========================= */

window.addEventListener("scroll", () => {

    const navbar =
    document.querySelector(".navbar");

    if(window.scrollY > 50){

        navbar.style.background =
        "rgba(5,11,22,0.96)";

        navbar.style.boxShadow =
        "0 10px 35px rgba(0,0,0,0.35)";

    }

    else{

        navbar.style.background =
        "rgba(5,11,22,0.85)";

        navbar.style.boxShadow =
        "none";

    }

});

/* ========================= */
/* SMOOTH BUTTON SCROLLING */
/* ========================= */

const primaryButton =
document.querySelector(".primary-btn");

const secondaryButton =
document.querySelector(".secondary-btn");

if(primaryButton){

    primaryButton.addEventListener("click", () => {

        document.querySelector("#products")
        .scrollIntoView({

            behavior:"smooth"

        });

    });

}

if(secondaryButton){

    secondaryButton.addEventListener("click", () => {

        document.querySelector("#introducing")
        .scrollIntoView({

            behavior:"smooth"

        });

    });

}

/* ========================= */
/* ACTIVE NAVIGATION */
/* ========================= */

const sections =
document.querySelectorAll("section");

const navLinks =
document.querySelectorAll(".nav-links a");

window.addEventListener("scroll", () => {

    let currentSection = "";

    sections.forEach(section => {

        const sectionTop =
        section.offsetTop;

        const sectionHeight =
        section.clientHeight;

        if(scrollY >= sectionTop - 200){

            currentSection =
            section.getAttribute("id");

        }

    });

    navLinks.forEach(link => {

        link.classList.remove("active");

        if(
            link.getAttribute("href")
            === `#${currentSection}`
        ){

            link.classList.add("active");

        }

    });

});

/* ========================= */
/* SCROLL REVEAL ANIMATION */
/* ========================= */

const revealElements =
document.querySelectorAll(

    ".problem-card, \
    .introducing-card, \
    .tech-box, \
    .product-card, \
    .limited-product-card, \
    .review-card"

);

function revealOnScroll(){

    revealElements.forEach(element => {

        const windowHeight =
        window.innerHeight;

        const elementTop =
        element.getBoundingClientRect().top;

        const revealPoint = 100;

        if(elementTop < windowHeight - revealPoint){

            element.style.opacity = "1";

            element.style.transform =
            "translateY(0px)";

        }

    });

}

window.addEventListener(
    "scroll",
    revealOnScroll
);

revealOnScroll();

/* ========================= */
/* INITIAL HIDDEN STATE */
/* ========================= */

revealElements.forEach(element => {

    element.style.opacity = "0";

    element.style.transform =
    "translateY(60px)";

    element.style.transition =
    "all 0.8s ease";

});

/* ========================= */
/* CART FUNCTIONALITY */
/* ========================= */

let cartCount = 0;

const cartCounter =
document.querySelector(".cart-count");

const addCartButtons =
document.querySelectorAll(".add-cart-btn");

addCartButtons.forEach(button => {

    button.addEventListener("click", () => {

        cartCount++;

        cartCounter.innerText =
        cartCount;

        button.innerText =
        "Added To Cart";

        button.style.background =
        "#5fa9ff";

        button.style.transform =
        "scale(0.98)";

        setTimeout(() => {

            button.style.transform =
            "scale(1)";

        },150);

    });

});

/* ========================= */
/* LIMITED DROP BUTTONS */
/* ========================= */

const limitedButtons =
document.querySelectorAll(".limited-btn");

limitedButtons.forEach(button => {

    button.addEventListener("click", () => {

        button.innerText =
        "Drop Reserved";

        button.style.background =
        "#5fa9ff";

    });

});

/* ========================= */
/* PRODUCT CARD HOVER GLOW */
/* ========================= */

const productCards =
document.querySelectorAll(

    ".product-card, \
    .limited-product-card"

);

productCards.forEach(card => {

    card.addEventListener("mousemove", e => {

        const rect =
        card.getBoundingClientRect();

        const x =
        e.clientX - rect.left;

        const y =
        e.clientY - rect.top;

        card.style.background =
        `
        radial-gradient(
        circle at ${x}px ${y}px,
        rgba(61,124,255,0.18),
        #0d1728 40%
        )
        `;

    });

    card.addEventListener("mouseleave", () => {

        card.style.background =
        "#0d1728";

    });

});

/* ========================= */
/* HERO IMAGE FLOATING */
/* ========================= */

const heroImage =
document.querySelector(".hero-image");

let floatDirection = 1;

setInterval(() => {

    if(heroImage){

        heroImage.style.transform =
        `translateY(${floatDirection * 10}px)`;

        heroImage.style.transition =
        "2.5s ease-in-out";

        floatDirection *= -1;

    }

},2500);

/* ========================= */
/* SCROLL TO TOP BUTTON */
/* ========================= */

/* CREATE BUTTON */

const scrollTopButton =
document.createElement("button");

scrollTopButton.innerHTML =
'<i class="fa-solid fa-arrow-up"></i>';

document.body.appendChild(
    scrollTopButton
);

/* STYLE BUTTON */

scrollTopButton.style.position =
"fixed";

scrollTopButton.style.bottom =
"30px";

scrollTopButton.style.right =
"30px";

scrollTopButton.style.width =
"55px";

scrollTopButton.style.height =
"55px";

scrollTopButton.style.borderRadius =
"50%";

scrollTopButton.style.border =
"none";

scrollTopButton.style.cursor =
"pointer";

scrollTopButton.style.background =
"linear-gradient(90deg,#3d7cff,#7b4dff)";

scrollTopButton.style.color =
"white";

scrollTopButton.style.fontSize =
"18px";

scrollTopButton.style.display =
"none";

scrollTopButton.style.zIndex =
"1000";

scrollTopButton.style.boxShadow =
"0 10px 25px rgba(0,0,0,0.35)";

/* SHOW BUTTON */

window.addEventListener("scroll", () => {

    if(window.scrollY > 500){

        scrollTopButton.style.display =
        "block";

    }

    else{

        scrollTopButton.style.display =
        "none";

    }

});

/* CLICK */

scrollTopButton.addEventListener(
    "click",
    () => {

        window.scrollTo({

            top:0,
            behavior:"smooth"

        });

    }
);

/* ========================= */
/* PAGE LOAD ANIMATION */
/* ========================= */

window.addEventListener("load", () => {

    document.body.style.opacity = "1";

});

document.body.style.opacity = "0";

document.body.style.transition =
"opacity 0.8s ease";