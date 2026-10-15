from extraction import Ingredient, Recipe, clean_recipe


def make_recipe(*ingredients: Ingredient) -> Recipe:
    return Recipe(title="Test recipe", ingredients=list(ingredients), steps=[])


def test_missing_amount_has_no_source():
    recipe = make_recipe(Ingredient(name="salt", quantity="not specified", source="description"))
    assert clean_recipe(recipe).ingredients[0].source == "none"


def test_missing_amount_check_ignores_case_and_spaces():
    recipe = make_recipe(Ingredient(name="salt", quantity="  Not Specified ", source="spoken"))
    assert clean_recipe(recipe).ingredients[0].source == "none"


def test_real_amount_keeps_its_source():
    recipe = make_recipe(Ingredient(name="butter", quantity="1 tbsp", source="description"))
    cleaned = clean_recipe(recipe).ingredients[0]
    assert cleaned.quantity == "1 tbsp"
    assert cleaned.source == "description"