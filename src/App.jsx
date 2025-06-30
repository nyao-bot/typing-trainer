import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import "./index.css";

function App() {
  // ステート変数の定義
  // wordList: タイピングゲームで使用する単語リスト
  // currentWord: 現在表示されている英単語とその日本語訳
  // userInput: ユーザーが入力したテキスト
  // score: 現在のスコア
  // combo: 現在のコンボ数
  // timeRemaining: 残り時間（秒）
  // isActive: ゲームがアクティブ（プレイ中）かどうか
  // isFinished: ゲームが終了したかどうか
  // isError: 入力エラーが発生したかどうか（シェイクアニメーション用）
  // leaderboard: リーダーボードのデータ
  // playerName: スコア登録時のプレイヤー名
  // scoreSubmitted: スコアが提出済みかどうか
  // inputRef: 隠された入力フィールドへの参照

  const [wordList, setWordList] = useState([]);
  const [currentWord, setCurrentWord] = useState({ english: "", japanese: "" });
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isError, setIsError] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const inputRef = useRef(null);

  // リーダーボードデータをFirestoreから取得する関数
  const fetchLeaderboard = useCallback(async () => {
    try {
      const scoresCollection = collection(db, "scores");
      const q = query(scoresCollection, orderBy("score", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const leaderboardData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("リーダーボードの取得中にエラーが発生しました: ", error);
    }
  }, []);

  // ゲーム開始時に単語リストとリーダーボードを読み込む副作用
  useEffect(() => {
    fetch("/words.json")
      .then((response) => response.json())
      .then((data) => setWordList(data.words))
      .catch((error) =>
        console.error("単語リストの取得中にエラーが発生しました:", error)
      );

    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // タイマーを管理する副作用
  useEffect(() => {
    let interval;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isActive) {
      endGame();
    }
    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  // 新しい単語を設定する関数
  const setNewWord = () => {
    if (wordList.length > 0) {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      setCurrentWord(wordList[randomIndex]);
    }
  };

  // ゲームを開始する関数
  const startGame = () => {
    if (wordList.length === 0) return; // 単語がロードされていない場合は開始しない
    setIsActive(true);
    setIsFinished(false);
    setScore(0);
    setCombo(0);
    setTimeRemaining(60);
    setUserInput("");
    setPlayerName("");
    setScoreSubmitted(false);
    setNewWord(); // 新しい単語を設定
    if (inputRef.current) {
      inputRef.current.focus(); // 入力フィールドにフォーカス
    }
  };

  // ゲームを終了する関数
  const endGame = () => {
    setIsActive(false);
    setIsFinished(true);
  };

  // ユーザーの入力処理
  const handleInputChange = (e) => {
    const typedValue = e.target.value;

    // 入力された文字が現在の単語の先頭と一致しない場合
    if (
      !currentWord.english.toLowerCase().startsWith(typedValue.toLowerCase())
    ) {
      setCombo(0); // コンボをリセット
      setIsError(true); // エラー状態を設定（シェイクアニメーションをトリガー）
      setTimeout(() => setIsError(false), 500); // 0.5秒後にエラー状態をリセット
      return; // それ以上の入力を受け付けない
    }

    setUserInput(typedValue); // ユーザー入力を更新

    // 入力された単語が現在の単語と完全に一致する場合
    if (typedValue.toLowerCase() === currentWord.english.toLowerCase()) {
      setScore((prevScore) => prevScore + 10 * (combo + 1)); // スコアを更新（コンボボーナス付き）
      setCombo((prevCombo) => prevCombo + 1); // コンボ数を増やす
      setUserInput(""); // 入力フィールドをクリア
      setNewWord(); // 次の単語を設定
    }
  };

  // スコアをFirestoreに提出する関数
  const handleScoreSubmit = async (e) => {
    e.preventDefault();
    if (playerName.trim() === "" || scoreSubmitted) return; // プレイヤー名が空または提出済みの場合は何もしない

    try {
      await addDoc(collection(db, "scores"), {
        name: playerName,
        score: score,
        timestamp: new Date(),
      });
      setScoreSubmitted(true); // 提出済み状態に設定
      fetchLeaderboard(); // リーダーボードを再取得して更新
    } catch (error) {
      console.error("スコアの追加中にエラーが発生しました: ", error);
    }
  };

  // 各文字のクラス名（色）を決定する関数
  const getCharClass = (char, index) => {
    if (index < userInput.length) {
      // 入力された文字が正しい場合、緑色
      // 間違っている場合、赤色と背景色
      return userInput[index].toLowerCase() === char.toLowerCase()
        ? "text-green-400"
        : "text-red-400 bg-red-900/50";
    }
    // 未入力の文字は灰色
    return "text-gray-500";
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-mono p-4">
      <div className="w-full max-w-5xl mx-auto flex justify-between items-start">
        {/* ゲームエリア */}
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-4 text-center">
            TOEIC Word Typing
          </h1>

          {/* ゲーム情報表示（時間、スコア、コンボ） */}
          <div className="flex items-center justify-around w-full mb-8 text-2xl">
            <div>
              時間:{" "}
              <span className="font-bold text-yellow-400">
                {timeRemaining}s
              </span>
            </div>
            <div>
              スコア: <span className="font-bold text-green-400">{score}</span>
            </div>
            <div>
              コンボ:{" "}
              <span className="font-bold text-orange-400">{combo}x</span>
            </div>
          </div>

          {/* ゲーム開始前の表示 */}
          {!isActive && !isFinished && (
            <div className="text-center">
              <button
                onClick={startGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-3xl disabled:bg-gray-500"
                disabled={wordList.length === 0}
              >
                {wordList.length > 0 ? "ゲーム開始" : "単語を読み込み中..."}
              </button>
            </div>
          )}

          {/* ゲーム中の表示 */}
          {isActive && (
            <div
              className="text-center"
              onClick={() => inputRef.current.focus()}
            >
              {" "}
              {/* クリックで入力フィールドにフォーカス */}
              {/* 英単語表示エリア（シェイクアニメーション付き） */}
              <div
                className={`text-5xl font-bold p-4 bg-gray-800 rounded-lg shadow-lg mb-2 tracking-widest cursor-text ${
                  isError ? "shake" : ""
                }`}
              >
                {currentWord.english.split("").map((char, index) => (
                  <span key={index} className={getCharClass(char, index)}>
                    {char}
                  </span>
                ))}
              </div>
              {/* 日本語訳表示エリア */}
              <div className="text-2xl text-gray-400 mb-4">
                {currentWord.japanese}
              </div>
            </div>
          )}

          {/* 隠された入力フィールド */}
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleInputChange}
            maxLength={currentWord.english.length}
            className="absolute w-0 h-0 opacity-0"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            lang="en"
            inputMode="latin"
          />

          {/* ゲーム終了後の表示 */}
          {isFinished && (
            <div className="text-center">
              <h2 className="text-3xl mb-4">時間切れ！</h2>
              <p className="text-5xl font-bold mb-6">最終スコア: {score}</p>
              {/* スコア提出フォーム */}
              {!scoreSubmitted ? (
                <form
                  onSubmit={handleScoreSubmit}
                  className="flex flex-col items-center"
                >
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="あなたの名前を入力してください"
                    className="w-full max-w-xs p-2 mb-4 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-xl text-center focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-2xl"
                  >
                    スコアを提出
                  </button>
                </form>
              ) : (
                <p className="text-2xl text-green-400">
                  スコアが提出されました！
                </p>
              )}
              {/* もう一度プレイボタン */}
              <button
                onClick={startGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-3xl mt-6"
              >
                もう一度プレイ
              </button>
            </div>
          )}
        </div>

        {/* リーダーボードエリア */}
        <div className="w-full max-w-sm ml-10">
          <h2 className="text-3xl font-bold mb-4 text-center">ランキング</h2>
          <div className="bg-gray-800 rounded-lg shadow-lg p-4">
            <ol className="list-decimal list-inside">
              {leaderboard.map((entry, index) => (
                <li
                  key={entry.id}
                  className={`flex justify-between p-2 rounded ${
                    index === 0 ? "text-yellow-300" : ""
                  }`}
                >
                  <span>
                    {index + 1}. {entry.name}
                  </span>
                  <span>{entry.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
