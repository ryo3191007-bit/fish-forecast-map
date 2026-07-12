# 唐津東港 3AI共通調査プロンプト

対象: ChatGPT / Gemini / Claude  
目的: 同一地点を同じ条件で調査し、Post-MVP-039の仕様とAI間の判定差を検証する

## 1. 参照する正本

調査前に次を読んでください。

- 調査仕様  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/FISHING_SPOT_RESEARCH_SPEC.md
- 二次情報源ポリシー  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/FISHING_SPOT_SECONDARY_SOURCE_POLICY.md
- JSON Schema  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/schemas/fishing-spot-research.schema.json
- 架空サンプル  
  https://github.com/ryo3191007-bit/fish-forecast-map/blob/main/docs/examples/fishing-spot-research.example.json

## 2. そのまま貼り付ける依頼文

```txt
唐津東港について、公開されている複数のWeb情報を手動調査し、
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
6. 複数の独立した民間情報源で一致する客観的事実
7. 個人ブログ・公開SNS

【調査手順】
1. まず公式・公的情報だけで全項目を調査する
2. 公式・公的情報で不足する項目だけ、民間情報や個人釣行記録を補助的に確認する
3. 民間情報1件のみの場合は原則confidence=lowとする
4. 独立した一般sourceが2件以上一致した場合のみ、内容に応じてconfidence=mediumを検討する
5. 最後まで根拠が不足する項目はunknownを維持する

【必須ルール】
・特定サイトの釣り場一覧、魚種一覧、説明構成を再現しない
・元ページの文章を転載または単純に言い換えない
・写真、地図画像、コメント、プロフィール情報を取得・保存しない
・ログイン限定ページやアクセス制限を回避しない
・スクレイピング、自動巡回、定期アクセスを行わない
・民間サイトの地図ピンを座標としてコピーしない
・各属性にvalue、status、confidence、sourceIds、checkedAtを付ける
・source.supportsに、そのsourceが直接支える属性を記載する
・confirmedとinferredを分離する
・confirmedは「sourceが直接述べている」という意味で、公式確定を意味しない
・確認できない項目はunknownにする
・水深、海底、潮通し、常夜灯、駐車場を雰囲気で断定しない
・港湾照明や航路標識灯を、釣り場の常夜灯と自動的にみなさない
・港湾施設の存在を、一般立入可能・釣り可能の根拠にしない
・釣り禁止、立入禁止、工事情報は公式情報を最優先する
・非公式sourceが禁止・閉鎖を明記する場合は、低確度の警告として保持してよい
・公式情報が見つからないだけでは、規制なしと判定しない
・釣り禁止と立入禁止を同一視しない
・施設の存在と、釣り目的で利用可能なことを分ける
・JSON以外の文章を出力しない

【魚種の採用条件】
次のどちらかを満たす魚種だけをbasis=observedとして登録してください。
1. 独立した2件以上のsourceが同一地点で言及する
2. 日付・地点・魚種が明確な具体的釣果記録がある

確度の目安:
・公式施設・公的観測: high
・独立した一般source2件以上が一致: medium
・日付付き釣果1件または個人記録1件: low

禁止:
・民間釣りサイトの掲載魚種一覧を丸ごと登録する
・釣果投稿1件から恒常的な対象魚と断定する
・生態的にあり得るだけの魚種をobservedにする

【比較用代表座標】
latitude: 33.459
longitude: 129.993

この座標を無条件にconfirmedとせず、
公式地区資料と公的地図で独立確認したうえでstatusとconfidenceを判断してください。

【最低限確認する公式候補】
・佐賀県 港湾施設の概要
  https://www.pref.saga.lg.jp/kiji00329386/index.html
・佐賀県 唐津港・伊万里港港湾脱炭素化推進計画
  https://www.pref.saga.lg.jp/kiji003110833/index.html
・佐賀県 港湾計画図
  https://www.pref.saga.lg.jp/kiji00313547/index.html
・国土地理院 地理院地図
  https://maps.gsi.go.jp/

【二次調査候補】
次のページを答えの正本として無条件に採用せず、
独立照合・低確度化・保存禁止事項を守って確認してください。

・魚速報 唐津東港の釣り場情報
  https://uosoku.com/home/kyuu/saga/kara/
・釣好大全九州 唐津東港の釣行記録
  https://kyusyu-ins.com/2021/01/15/2021-01-15karatu/

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

比較前に次を確認します。

- Schema適合
- source URLの実在性
- sourceがsupportsの項目を実際に裏付けているか
- 民間sourceを独立sourceとして数えられるか
- 魚種一覧を実質的にコピーしていないか
- low confidenceを過大評価していないか
- 規制なし、障害物なし、常夜灯あり等を弱い根拠で断定していないか

Schemaに通すためだけに人間が値を補完しないでください。
