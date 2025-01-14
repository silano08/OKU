// 상품등록관련
require("dotenv").config();
const multer = require("multer");
const Product = require("../schema/product");
const PriceHistory = require("../schema/pricehistory");
const Alert = require("../schema/alert");
const User = require("../schema/user");
const jwt = require("jsonwebtoken");
const Joi = require("@hapi/joi");
const { authMiddlesware } = require("../middlewares/auth-middleware.js");
const upload = require("../middlewares/imageupload.js");
const { ValidationError } = require("@hapi/joi");

//상품 등록하기
exports.productpost = async (req, res, next) => {
	const user = res.locals.user;

	try {
		let images;
		if (req.files.length != 0) {
			images = [];
			for (let i = 0; i < req.files.length; i++) {
				images.push(req.files[i].location);
			}
		} else {
			images = [
				"https://okuhanghae.s3.ap-northeast-2.amazonaws.com/public/logo512.png",
			];
			//res.send({ image: false });
		}

		// 유효성 검사
		// title 글자수 , sucBid 5000만 이하 , descript 300자 이하
		const postSchema = Joi.object({
			title: Joi.string().min(2).max(25),
			sucbid: Joi.number().min(10).max(50000000),
			description: Joi.string().max(300),
		});

		const {
			title,
			lowbid,
			sucbid,
			state,
			description,
			tag,
			bigCategory,
			smallCategory,
			region,
			deliveryprice,
			duration,
		} = await postSchema.validateAsync(req.body);

		const addTime = (date, milliseconds) => {
			return new Date(date.getTime() + milliseconds * 1);
		};

		const newProduct = await Product.create({
			title,
			img: images,
			nickname: user["nickname"],
			sellerunique: user["_id"],
			lowBid: lowbid,
			sucBid: sucbid,
			state: state,
			description: description,
			tag: tag,
			bigCategory: bigCategory,
			smallCategory: smallCategory,
			region: region,
			deliveryPrice: deliveryprice,
			deadLine: addTime(new Date(), duration),
		});

		newProduct.save();

		res.send({ msg: "상품이 등록되었습니다" });
	} catch (error) {
		if (error instanceof multer.MulterError) {
			console.log("multer error", error);
			res.send({ msg: "multer error" });
		}

		res.send({ msg: "상품 등록에 실패하였습니다.", error });
		console.log(error);
	}
};

//상품 목록 조회순으로 불러오기
exports.popular = async (req, res) => {
	try {
		// onSale:true
		const popularList = await Product.aggregate([
			{ $match: { onSale: true } },
			{ $sort: { views: -1, date: -1 } },
			{ $limit: 5 },
		]);

		res.send({ okay: true, result: popularList });
	} catch (error) {
		res.send({ okay: false, error });
	}
};

//상품 목록 최신순으로 불러오기
exports.newone = async (req, res) => {
	let productList = [];
	//마지막으로 불러들인 아이템, query문으로 받아옴.
	let lastId = req.query["lastId"];
	let products;
	const print_count = 12;
	try {
		//무한스크롤
		if (lastId) {
			//무한스크롤 도중일 경우
			products = await Product.find({ onSale: true })
				.sort({ createAt: -1 })
				.where("_id")
				.lt(lastId)
				.limit(print_count);
			console.log("lastId", products);
		} else {
			//처음 페이지에서 스크롤을 내리기 시작할 때
			products = await Product.find({ onSale: true })
				.sort({ createAt: -1 })
				.limit(print_count);
		}
		productList.push(products);
		res.send({ okay: true, productList });
	} catch (error) {
		res.send({ okay: false, error });
		console.log(error);
	}
};

exports.allProducts = async (req, res) => {
	const result = await Product.find({}).sort({ createAt: -1 });
	try {
		res.send({ result });
	} catch (error) {
		res.send({ result: false, error });
	}
};

//마감임박 상품 목록 뿌려주기
exports.deadLineList = async (req, res) => {
	const halfHour = 1800000;
	const today = new Date();
	const list = [];
	try {
		//주어진 시각에서 30분을 빼는 함수
		const calTime = (date, milliseconds) => {
			return new Date(date.getTime() - milliseconds * 1);
		};
		const products = await Product.find({});
		//전체 상품의 deadLine list 중 30분만 남은 제품 불러오기
		for (let i = 0; i < products.length; i++) {
			const toDeadLine = calTime(products[i].deadLine, halfHour);
			//deadLine이 30분 미만으로 남았고,
			//마감이 되지 않은 경우
			if (today > toDeadLine && products[i].deadLine > today) {
				list.push(products[i]);
			}
		}
		if (list.length == 0) {
			return res.send({ result: "empty" });
		}
		res.send({ result: list });
	} catch (error) {
		res.send({ error });
		console.error(error);
	}
};

exports.detail = async (req, res) => {
	// res.send(req.params);
	// console.log(req.params["id"]);
	try {
		const product = await Product.findOneAndUpdate(
			{ _id: req.params["id"] },
			{ $inc: { views: 1 } },
			{ __v: 0 }
		);

		const user = await User.findOne(
			{ _id: product["sellerunique"] },
			{ profileImg: 1, nickname: 1, _id: 1 }
		);
		res.json({ okay: true, result: product, seller: user });
	} catch (error) {
		res.send({ okay: false });
	}
};

exports.relate = async (req, res) => {
	// 소분류 카테고리값 받는게 더 나을것같음
	const { smallCategory, tag } = req.body;

	// console.log(product);
	try {
		// 첫번째 이미지 + lowbid + title + bid(현재입찰가)
		// onsale:true만
		const a = await Product.find(
			{
				$or: [
					{ tag: new RegExp(tag) },
					{ smallCategory: new RegExp(smallCategory) },
				],
			},
			{ img: 1, title: 1, lowBid: 1, sucBid: 1, _id: 1 }
		).limit(4);

		res.send({ okay: true, result: a });
	} catch (error) {
		res.send({ okay: false });
	}
};
