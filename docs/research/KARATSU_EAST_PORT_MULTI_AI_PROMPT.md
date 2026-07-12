# 唐津東港 3AI共通調査プロンプト

対象: ChatGPT / Gemini / Claude  
目的: 同一地点を同じ条件で調査し、Post-MVP-039の仕様とAI間の判定差を検証する

## 1. 参照する正本

調査前に次を読んでください。

- 調査仕様  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/FISHING_SPOT_RESEARCH_SPEC.md
- JSON Schema  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/schemas/fishing-spot-research.schema.json
- 架空サンプル  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/examples/fishing-spot-research.example.json

## 2. そのまま貼り付ける依頼文

```txt
唐津東港について、公開されている複数のWeb情報を調査し、
fish-forecast-mapの fishing-spot-research.schema.json に適合するJSONを作成してください。

【対象】
地点名: 唐津東港
別名候補: 唐津港東港地区、東港地区
都道府県: 佐賀県
市区町村: 唐津市
調査日は実行日を使用してください。

【情報源の優先順位】
1. 佐賀県、唐津市、港湾・漁港管理者
2. 国土地理院、海上保安庁等の公的地理情報
3. 水産研究機関、佐賀県水産試験場等
4. 施設・管理主体の公式情報
5. 報道・地域メディア
6. 複数の民間情報源で一致する客観的事実
7. 個人ブログ・SNS

【必須ルール】
・民間釣りサイトは地点候補を知る入口に限定する
・特定サイトの釣り場一覧、魚種一覧、説明構成を再現しない
・元ページの文章を転載または単純に言い換えない
・写真、地図画像、コメント、プロフィール情報を取得・保存しない
・ログイン限定ページやアクセス制限を回避しない
・スクレイピング、自動巡回、定期アクセスを行わない
・民間サイトの地図ピンを座標としてコピーしない
・各属性に value、status、confidence、sourceIds、checkedAt を付ける
・source.supports に、そのsourceが直接支える属性を記載する
・confirmed と inferred を分離する
・確認できない項目は unknown にする
・unknownを推測で埋めない
・水深、海底、潮通し、常夜灯、駐車場を雰囲気で断定しない
・港湾照明や航路標識灯を、釣り場の常夜灯と自動的にみなさない
・港湾施設の存在を、一般立入可能・釣り可能の根拠にしない
・釣り禁止、立入禁止、工事情報は公式情報を最優先する
・公式情報が見つからないだけでは、規制なしと判定しない
・observed魚種とexpected魚種を分ける
・民間釣りサイト1件の魚種一覧をobservedへ登録しない
・JSON以外の文章を出力しない

【比較用代表座標】
latitude: 33.459
longitude: 129.993

この座標を無条件にconfirmedとせず、
公式地区資料と公的地図で独立確認したうえでstatusとconfidenceを判断してください。

【最低限確認する公式候補】
・佐賀県 港湾施設の概要の公示
  https://www.pref.saga.lg.jp/kiji00329386/index.html
・佐賀県 唐津港・伊万里港港湾脱炭素化推進計画
  https://www.pref.saga.lg.jp/kiji003110833/index.html
・佐賀県 港湾計画図
  https://www.pref.saga.lg.jp/kiji00313547/index.html
・国土地理院 地理院地図
  https://maps.gsi.go.jp/

【出力】
JSON Schemaに適合するJSONだけを出力してください。
Markdownコードフェンスや説明文は付けないでください。
```

## 3. Schemaを参照できない場合の主要enum

```txt
status:
confirmed | inferred | unknown

confidence:
high | medium | low

spotType:
port | fishing_port | breakwater | revetment | sandy_beach |
rocky_shore | river_mouth | fishing_facility | mixed | unknown

seabed:
sand | mud | rock | seaweed | mixed | unknown

waterDepth:
shallow | moderate | deep | unknown

riverInfluence:
none | weak | strong | unknown

tidalFlow:
weak | moderate | strong | unknown

streetLights:
present | absent | unknown

obstacles:
tetrapods | rocks | seaweed | bridge_piers |
wave_dissipating_blocks | other | none | unknown

openSeaExposure:
inner_bay | bay | bay_mouth | open_sea | unknown

fishingRange:
foot | near | long_cast | unknown

availability:
available | not_available | unknown

restriction:
yes | no | partial | unknown
```

## 4. 回収時の注意

各AIの出力は修正せず、そのまま別ファイルで保存してから比較します。

推奨ファイル名:

```txt
karatsu-east-port.chatgpt.json
karatsu-east-port.gemini.json
karatsu-east-port.claude.json
```

比較前に、Schema適合とsource URLの実在性を確認します。Schemaに通すためだけに人間が値を補完しないでください。
