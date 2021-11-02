import nltk
import sys
from rake_nltk import Rake
from nltk.corpus import stopwords
import string

#print('#Hello from python#')
#print('First param:'+sys.argv[1]+'#')

sentence = sys.argv[1]

#sentence = """I want to see a movie with no gore and violence but has a high school setting like diary of a bully"""

"""
NOTICE: requires Python 3.7.4, pip
requires nltk package:
> pip install nltk
> pip install rake-nltk

TODO:
1. Remove movie from the original sentence or else it fucks up the parsing.
"""

# tokens = nltk.word_tokenize(sentence)

# # print(tokens)

# tokens_tag = nltk.pos_tag(tokens)

# # print(tokens_tag)

# is_adj = lambda pos: pos[:2] == 'JJ'
# is_adj_comp = lambda pos: pos[:2] == 'JJR'
# is_adj_super = lambda pos: pos[:2] == 'JJS'

# adjs = [word for (word, pos) in tokens_tag if is_adj(pos)]
# comp_adjs = [word for (word, pos) in tokens_tag if is_adj_comp(pos)]
# super_adjs = [word for (word, pos) in tokens_tag if is_adj_super(pos)]
# proper_nouns = [word for (word, pos) in tokens_tag if pos == 'NNP']


# print({'''adjs''': adjs})
# # print(comp_adjs)
# # print(super_adjs)
# print({'''proper_nouns''': proper_nouns})

# grammar = "NP: {<JJ>*<NN><CC>?<IN>?<DT>?<JJ>*<NN>?}"
# cp = nltk.RegexpParser(grammar)
# result = cp.parse(tokens_tag)

#print(result)

# Uses stopwords for english from NLTK, and all puntuation characters by
# default
stopwords = nltk.corpus.stopwords.words('english')
stopwords.remove("don")
stopwords.remove("don't")
stopwords.remove("do")
stopwords.remove("not")
new_stopwords=('movie', 'movies')
stopwords.extend(new_stopwords)

r = Rake(stopwords=stopwords)

# Extraction given the text.
r.extract_keywords_from_text(sentence)

# To get keyword phrases ranked highest to lowest with scores.
result = r.get_ranked_phrases()
for token in result:
    print(token)
