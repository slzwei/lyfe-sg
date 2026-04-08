function setCookie(name, value) {
  // const d = new Date();
  // d.setTime(d.getTime() + d.getTime() * 24 * 60 * 60 * 1000);
  // let expires = "expires=" + d.toUTCString();
  // document.cookie = name + "=" + value + ";" + expires;
  document.cookie = name + "=" + value + ";";
}

jQuery("document").ready(function () {
  let modalContent = jQuery(".modal-content");
  let browserCookie = decodeURIComponent(document.cookie);
  let cookieArr = browserCookie.split(";");
  let popupCookie = 0;
  let successMsgs = 0;
  cookieArr.map(function (val) {
    if (val == " popup=cookie" || val == "popup=cookie") {
      popupCookie = 1;
    }
    if (val == " success=cookie" || val == "success=cookie") {
      successMsgs = 1;
    }
  });

  if (popupCookie == 0) {
    setTimeout(() => {
      let modalContent = jQuery(".newsletter-form");
      modalContent.show();
      jQuery("html, body").css({
        //    overflow: 'hidden',
        height: "100%",
      });
    }, "1000");
  }
  //Success message.
  let mainUrl = window.location.href;
  mainUrl = new URL(mainUrl);
  let url = window.location.search;
  const urlParams = new URLSearchParams(url);
  const msg = urlParams.get("msg");
  if (msg == "success") {
    var successMsg = jQuery("#sucess-msg");

    // Scroll  On
    jQuery("html, body").css({
      overflow: "initial",
      //height: '100%'
    });

    //Show success popup if cookie is not set
    if (successMsgs == 0) {
      successMsg.show();
    }

    // Hide Success Modal on Scroll also set cookie on scroll.
    jQuery(window).scroll(function () {
      var nowScrollTop = jQuery(this).scrollTop();
      if (nowScrollTop > 5) {
        successMsg.hide();
        setCookie("success", "cookie");
      }
    });
  }

  //Cross Success Message
  jQuery("#cross-success").on("click", function () {
    modalContent.hide();
    jQuery("html, body").css({
      overflow: "initial",
      //height: '100%'
    });
    setCookie("success", "cookie");
  });

  jQuery(".cross").on("click", function () {
    modalContent.hide();
    jQuery("html, body").css({
      overflow: "initial",
      //height: '100%'
    });
    setCookie("popup", "cookie");
    //window.location.href=`${mainUrl.origin}`
  });
  jQuery("#mc4wp-form-1").on("submit", function (e) {
    setCookie("popup", "cookie");
    jQuery("html, body").css({
      overflow: "initial",
      //height: '100%'
    });
  });

  if (jQuery(window).width()) {
    jQuery(".header-menu-bt").attr("href", "#");
    jQuery(".header-menu-bt").removeAttr("target");
    jQuery(".header-menu-bt").click(function () {
      jQuery(".sub-menu").toggle();
    });
  }

  jQuery(".dropdown-trigger").on("click", function () {
    console.log("dropdown");
    jQuery(this).siblings("ul").slideToggle(300);
    jQuery(this).toggleClass("active");
  });

  jQuery(".accordion-title").on("click", function () {
    let target = jQuery(this);
    let content = target.siblings(".accordion-content");

    jQuery(".accordion-title").not(target).removeClass("active");
    target.toggleClass("active");
    jQuery(".accordion-content").not(content).slideUp(300);
    content.slideToggle(300);
  });
});

document.querySelector("button.mute").addEventListener("click", function () {
  this.classList.toggle("muted");
  this.classList.remove("pulse");
  document.querySelector(".hero video").muted =
    !document.querySelector(".hero video").muted;
});
