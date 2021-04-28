// 상품등록관련
require('dotenv').config();
const user = require("../schema/user");
const Product = require("../schema/product");
// const user = require("../schema/user");
const { authMiddlesware } = require("../middlewares/auth-middleware.js");
const { upload } = require("../middlewares/imageupload.js");

exports.test = async (req, res) => {
    console.log(res.locals.user);
    res.send(res.locals.user);
}

exports.productpost = async (req, res) => {
    const {
        title,
        img,
        nickname,
        lowbid,
        sucbid,
        state,
        description,
        tag,
        bigCategory,
        smallCategory,
        region,
        deliveryprice,
        deadline
    } = req.body;

    try {
        await Product.create({
            title: title,
            img: img,
            nickname: nickname,
            lowBid: lowbid,
            sucBid: sucbid,
            state: state,
            description: description,
            tag: tag,
            bigCategory: bigCategory,
            smallCategory: smallCategory,
            region: region,
            deliveryPrice: deliveryprice,
            deadLine: deadline
        });

        res.send({ msg: "상품이 등록되었습니다" });
    } catch (error) {
        res.send({ msg: "상품이 등록에 실패하였습니다." });
    }
}

exports.bidding = async (req, res) => {
    // const user = res.locals.user;
    try {

    } catch (error) {

    }
}