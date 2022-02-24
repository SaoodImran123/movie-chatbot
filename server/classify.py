from simpletransformers.classification import ClassificationModel
import json

# Create a ClassificationModel
model = ClassificationModel(
    "bert", "./server/bert_model"
)

predictions, raw_outputs = model.predict(["I want more marvel movies"])

categories = ["genre", "production company", "cast", "release date", "language", "age restriction", "runtime"]

returnData = {}
for i in range(0, len(raw_outputs[0])):
    returnData[categories[i]] = raw_outputs[0][i]

# TODO return a list of keywords per category
print(returnData)

#print(predictions)
#print("Predication: " + categories[predictions[0]])
#print("Genre:" + str(raw_outputs[0][0]) + " \n" + "Prod Company:" + str(raw_outputs[0][1]) + " \n" + "Cast:" + str(raw_outputs[0][3]) + " \n" + "Release Date:" + str(raw_outputs[0][3]) + " \n" + "Language:" + str(raw_outputs[0][4]) + " \n" + "Age Restriction:" + str(raw_outputs[0][5]) + " \n" + "Run Time:" + str(raw_outputs[0][6]) + " ")
